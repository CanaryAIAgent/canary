/**
 * Canary — EOC AI Chat Assistant
 *
 * POST /api/chat
 *
 * Streaming chat endpoint for the EOC command dashboard AI panel.
 * The assistant has access to all agent tools: it can triage incidents,
 * check shelter capacity, search historical incidents, and more.
 * All mutations persist to Supabase.
 */

import { streamText, generateObject, UIMessage, convertToModelMessages, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { getModel, getPhotoModel, type ModelTier } from '@/lib/ai/config';
import { PhotoAnalysisResponseSchema } from '@/lib/schemas';
import {
  checkShelterCapacityTool,
  createIncidentTool,
  updateIncidentStatusTool,
  searchSimilarIncidentsTool,
  logAgentActionTool,
  notifyHumanTool,
} from '@/lib/agents/tools';
import {
  addSignal,
  addActivity,
  updateStats,
  updateRecommendation,
  setProtocolSteps,
  getDashboardData,
} from '@/lib/data/store';
import { dbInsertIncident, dbGetIncident, dbInsertAgentLog, dbUpdateIncident, dbListIncidents } from '@/lib/db';

export const maxDuration = 60;

const EOC_SYSTEM_PROMPT = `You are the Canary AI Assistant — the intelligent command interface for an Emergency Operations Center (EOC) managing physical disaster response.

## Your Capabilities
- Analyze incoming disaster signals (field reports, social media, camera feeds)
- Triage incidents and assess severity, blast radius, and affected population
- Recommend resource deployment and response actions
- Search historical incidents for institutional knowledge
- Check shelter capacity and availability
- Create and track incidents through their lifecycle
- Generate ICS-compliant reports
- Push live updates to the EOC dashboard (signals, activity, recommendations)

## Personality
- Decisive and concise — incident commanders need fast answers
- Use emergency management terminology (ICS, NIMS, ATC-45)
- Always state your confidence level when making assessments
- Flag when human approval is needed for irreversible actions
- Never speculate without clearly marking uncertainty

## Dashboard Integration
You can push updates to the live dashboard using these tools:
- pushSignal: Add a new signal card AND create an incident. Use ONLY for NEW reports you haven't seen before.
- pushActivity: Log an action to the activity feed.
- pushRecommendation: Update the AI strategy recommendation panel. ALWAYS use this when providing triage analysis or strategic advice. Include actionSequence, confidenceScore, stats, and ctaLabel.
- setResponseProtocol: Set the response protocol checklist. ALWAYS use this when recommending a sequence of response steps.
- updateDashboardStats: Update the key metrics row.
- createIncident: Create a formal incident record. Use ONLY for genuinely new incidents.

## Photo Analysis
When the user uploads images in the chat, you MUST call the analyzePhotos tool to run AI-powered damage assessment. The images are automatically extracted from the message — you do NOT need to pass any image URLs. Just call analyzePhotos with optional context (title, description, location, incidentId). After analysis, summarize the findings and push relevant updates to the dashboard.

## CRITICAL RULES
- When the user sends images: ALWAYS call analyzePhotos immediately. Do NOT try to pass image data — it is extracted automatically.
- When asked to TRIAGE an existing incident: use pushRecommendation and setResponseProtocol. Do NOT create a new incident or use pushSignal.
- When asked to REPORT a new signal: use pushSignal (which creates an incident automatically).
- When asked to GENERATE A REPORT: provide a detailed analysis as text and use pushRecommendation to summarize key findings.
- ALWAYS push updates to the dashboard — don't just respond with text.

## Context
Current dashboard state will be provided. Use it to inform your responses and avoid duplicate entries.`;

export async function POST(req: Request) {
  const { messages, modelTier }: { messages: UIMessage[]; modelTier?: ModelTier } = await req.json();

  // Extract image data URLs from the latest user message for tool access
  const latestUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const chatImageUrls: string[] = [];
  if (latestUserMsg?.parts) {
    for (const part of latestUserMsg.parts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = part as any;
      if (p.type === 'file' && p.mediaType?.startsWith('image/') && p.url) {
        chatImageUrls.push(p.url);
      }
    }
  }

  // Include current dashboard state as context
  const dashboardState = getDashboardData();

  const result = streamText({
    model: getModel(modelTier ?? 'flash'),
    system: EOC_SYSTEM_PROMPT + `\n\n## Current Dashboard State\n${JSON.stringify(dashboardState, null, 2)}`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      // Dashboard mutation tools — all persist to Supabase
      pushSignal: tool({
        description: 'Push a new signal card to the live EOC dashboard signal feed AND create an incident in the database. Use this when you identify a new signal from a field report, social media post, or camera alert.',
        inputSchema: z.object({
          tag: z.string().describe('Signal category tag, e.g. "CRITICAL // FIELD", "LIVE // CAMERA", "SOCIAL // X"'),
          tagColor: z.string().describe('CSS class: text-error, text-tertiary, or text-on-surface-variant'),
          title: z.string().describe('Signal title, e.g. "Structural Collapse — Oak St"'),
          desc: z.string().describe('Signal description'),
          source: z.string().describe('Signal source, e.g. "Field Responder", "Camera Feed AI"'),
          icon: z.string().describe('Material Symbols icon name'),
          severity: z.number().describe('Severity 1-5 for incident creation'),
          incidentType: z.string().describe('One of: flood, fire, structural, medical, hazmat, earthquake, infrastructure, cyber, other'),
        }),
        execute: async ({ tag, tagColor, title, desc, source, icon, severity, incidentType }) => {
          // Update in-memory dashboard
          const card = addSignal({
            tag,
            tagColor,
            title,
            desc,
            source,
            time: 'just now',
            icon,
          });

          // Persist to Supabase
          let incidentId: string | undefined;
          try {
            const validTypes = ['flood', 'fire', 'structural', 'medical', 'hazmat', 'earthquake', 'infrastructure', 'cyber', 'other'] as const;
            const iType = validTypes.includes(incidentType as typeof validTypes[number])
              ? (incidentType as typeof validTypes[number])
              : 'other' as const;

            const incident = await dbInsertIncident({
              title,
              description: desc,
              type: iType,
              severity: Math.round(Math.min(5, Math.max(1, severity))),
              status: 'new',
              location: {},
              sources: ['field'],
              mediaUrls: [],
              corroboratedBySignals: [],
              linkedCameraAlerts: [],
            });
            incidentId = incident.id;
          } catch (err) {
            console.error('[chat/pushSignal] DB persist failed:', err);
          }

          return { success: true, signalId: card.id, incidentId, message: `Signal "${title}" pushed to dashboard and persisted` };
        },
      }),

      pushActivity: tool({
        description: 'Log an action to the EOC field activity feed AND persist to audit log. Use this when you take an action, make a decision, or observe something noteworthy.',
        inputSchema: z.object({
          actor: z.string().describe('Who performed the action, e.g. "Triage Agent", "Orchestrator", "EOC Base", "AI Assistant"'),
          action: z.string().describe('Description of the action taken'),
        }),
        execute: async ({ actor, action }) => {
          // Update in-memory
          const entry = addActivity(actor, action);

          // Persist to Supabase agent_logs
          try {
            await dbInsertAgentLog({
              agentType: 'orchestrator',
              sessionId: crypto.randomUUID(),
              stepIndex: 0,
              decisionRationale: `${actor}: ${action}`,
              toolCallsAttempted: [],
              toolCallsSucceeded: [],
              toolCallsFailed: [],
              actionsEscalated: [],
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            console.error('[chat/pushActivity] DB persist failed:', err);
          }

          return { success: true, activityId: entry.id };
        },
      }),

      pushRecommendation: tool({
        description: 'Update the AI strategy recommendation panel on the dashboard. Use this when you have a clear action recommendation for the incident commander.',
        inputSchema: z.object({
          actionSequence: z.string().describe('The recommended sequence of actions'),
          confidenceScore: z.number().describe('Confidence in this recommendation (0-100)'),
          stats: z.array(z.object({
            label: z.string(),
            value: z.string(),
          })).describe('Key stats to display'),
          ctaLabel: z.string().describe('Call-to-action button label, e.g. "Approve Dispatch"'),
        }),
        execute: async ({ actionSequence, confidenceScore, stats: recStats, ctaLabel }) => {
          updateRecommendation({ actionSequence, confidenceScore, stats: recStats, ctaLabel });

          // Persist to active incident's ai_analysis in Supabase
          try {
            const incidents = await dbListIncidents({ status: ['new', 'triaging', 'responding', 'escalated'], limit: 1 });
            if (incidents.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const existing = (incidents[0].aiAnalysis ?? {}) as any;
              await dbUpdateIncident(incidents[0].id, {
                aiAnalysis: {
                  ...existing,
                  recommendation: { actionSequence, confidenceScore, stats: recStats, ctaLabel },
                  generatedAt: new Date().toISOString(),
                } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                status: 'triaging',
              });
            }
            await dbInsertAgentLog({
              agentType: 'orchestrator',
              sessionId: crypto.randomUUID(),
              stepIndex: 0,
              decisionRationale: `AI Recommendation (${confidenceScore}%): ${actionSequence}`,
              confidenceScore: confidenceScore / 100,
              toolCallsAttempted: [],
              toolCallsSucceeded: [],
              toolCallsFailed: [],
              actionsEscalated: [],
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            console.error('[chat/pushRecommendation] DB persist failed:', err);
          }

          return { success: true, message: 'Recommendation panel updated and persisted' };
        },
      }),

      updateDashboardStats: tool({
        description: 'Update the key metrics row at the top of the EOC dashboard.',
        inputSchema: z.object({
          activeIncidents: z.number().optional(),
          incidentDelta: z.string().optional().describe('e.g. "+2/hr"'),
          resourceRequests: z.number().optional(),
          resourceStatus: z.string().optional().describe('e.g. "Pending", "Dispatched"'),
        }),
        execute: async (partial) => {
          updateStats(partial);
          return { success: true, message: 'Dashboard stats updated' };
        },
      }),

      setResponseProtocol: tool({
        description: 'Set the response protocol checklist on the dashboard. Use this when establishing or updating the incident response plan.',
        inputSchema: z.object({
          steps: z.array(z.object({
            step: z.string().describe('Protocol step description'),
            done: z.boolean().describe('Whether this step is complete'),
            active: z.boolean().optional().describe('Currently being worked on'),
          })),
        }),
        execute: async ({ steps }) => {
          setProtocolSteps(steps);

          // Persist protocol to active incident's ai_analysis
          try {
            const incidents = await dbListIncidents({ status: ['new', 'triaging', 'responding', 'escalated'], limit: 1 });
            if (incidents.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const existing = (incidents[0].aiAnalysis ?? {}) as any;
              await dbUpdateIncident(incidents[0].id, {
                aiAnalysis: {
                  ...existing,
                  protocolSteps: steps,
                } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
              });
            }
          } catch (err) {
            console.error('[chat/setResponseProtocol] DB persist failed:', err);
          }

          return { success: true, message: `Protocol set with ${steps.length} steps` };
        },
      }),

      // Photo analysis tool — multimodal AI damage assessment
      analyzePhotos: tool({
        description: 'Analyze incident photos uploaded by the user in this chat message. The images are automatically extracted — you do NOT need to pass image URLs. Just call this tool when the user uploads photos.',
        inputSchema: z.object({
          incidentId: z.string().uuid().optional().describe('Existing incident ID to link photos to'),
          title: z.string().optional().describe('Title for a new incident (required if no incidentId)'),
          description: z.string().optional().describe('Additional context about the photos'),
          location: z.string().optional().describe('Location context if known'),
        }),
        execute: async ({ incidentId, title, description, location }) => {
          try {
            if (chatImageUrls.length === 0) {
              return { success: false, error: 'No images found in the current message. Please upload photos first.' };
            }
            const imageParts = chatImageUrls.map((url) => ({ type: 'image' as const, image: url }));

            const promptText = [
              'Analyze the following incident photo(s) for emergency response purposes.',
              'Identify any damage, hazards, structural issues, and relevant details.',
              'Provide a severity rating from 1 (minor) to 5 (critical).',
              'Categorize the type of damage using ATC-45 rapid assessment categories if applicable.',
              'List any detected objects, hazards, and recommended actions.',
              location ? `Known location context: ${location}` : null,
              description ? `Additional context: ${description}` : null,
            ].filter(Boolean).join('\n');

            const { object: analysis } = await generateObject({
              model: getPhotoModel('nano-banana'),
              schema: PhotoAnalysisResponseSchema,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: promptText },
                    ...imageParts,
                  ],
                },
              ],
            });

            const finalSeverity = analysis.severity ?? 3;
            let resultIncidentId: string;
            let isNewIncident = false;

            if (incidentId) {
              const existing = await dbGetIncident(incidentId);
              if (existing) {
                await dbUpdateIncident(incidentId, {
                  aiAnalysis: analysis,
                  severity: finalSeverity,
                });
                resultIncidentId = incidentId;
              } else {
                return { success: false, error: 'Incident not found' };
              }
            } else {
              const incidentType = ['flood', 'fire', 'structural', 'medical', 'hazmat', 'earthquake', 'infrastructure', 'cyber'].includes(analysis.damageCategory ?? '')
                ? analysis.damageCategory as 'flood' | 'fire' | 'structural' | 'medical' | 'hazmat' | 'earthquake' | 'infrastructure' | 'cyber'
                : 'other' as const;

              const newIncident = await dbInsertIncident({
                title: title || analysis.summary || 'Photo Analysis Incident',
                description: description || analysis.summary || '',
                type: incidentType,
                severity: finalSeverity,
                status: 'new',
                location: location ? { description: location } : (analysis.extractedAddress ? { description: analysis.extractedAddress } : {}),
                sources: ['field'],
                aiAnalysis: analysis,
                mediaUrls: [],
                corroboratedBySignals: [],
                linkedCameraAlerts: [],
              });
              resultIncidentId = newIncident.id;
              isNewIncident = true;

              updateStats({ activeIncidents: (getDashboardData().stats.activeIncidents) + 1 });
            }

            // Push to dashboard
            const tagPrefix = finalSeverity >= 4 ? 'CRITICAL' : finalSeverity >= 3 ? 'ALERT' : 'MONITOR';
            addSignal({
              tag: `${tagPrefix} // PHOTO`,
              tagColor: finalSeverity >= 4 ? 'text-error' : finalSeverity >= 3 ? 'text-tertiary' : 'text-on-surface-variant',
              title: title || analysis.summary || 'Photo Analysis',
              desc: analysis.summary || 'AI photo analysis completed',
              source: 'Chat Photo Upload',
              time: 'just now',
              icon: 'photo_camera',
              incidentId: resultIncidentId,
            });

            addActivity('Photo Analyzer', `Analyzed ${chatImageUrls.length} photo(s) via chat — severity ${finalSeverity}`);

            return {
              success: true,
              incidentId: resultIncidentId,
              isNewIncident,
              severity: finalSeverity,
              summary: analysis.summary,
              hazards: analysis.hazards,
              structuralIntegrity: analysis.structuralIntegrity ?? 'unknown',
              damageCategory: analysis.damageCategory ?? 'unknown',
              detectedObjects: analysis.detectedObjects ?? [],
              recommendedActions: analysis.recommendedActions ?? [],
              confidence: analysis.confidence,
            };
          } catch (err) {
            console.error('[chat/analyzePhotos] error:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Photo analysis failed' };
          }
        },
      }),

      // Agent tools — already persist to Supabase via lib/db
      checkShelterCapacity: checkShelterCapacityTool,
      createIncident: createIncidentTool,
      updateIncidentStatus: updateIncidentStatusTool,
      searchSimilarIncidents: searchSimilarIncidentsTool,
      logAgentAction: logAgentActionTool,
      notifyHuman: notifyHumanTool,
    },
  });

  return result.toUIMessageStreamResponse();
}
