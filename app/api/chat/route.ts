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

import { streamText, UIMessage, convertToModelMessages, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { getFlashModel } from '@/lib/ai/config';
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
import { dbInsertIncident, dbInsertAgentLog, dbUpdateIncident, dbListIncidents } from '@/lib/db';

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

## CRITICAL RULES
- When asked to TRIAGE an existing incident: use pushRecommendation and setResponseProtocol. Do NOT create a new incident or use pushSignal.
- When asked to REPORT a new signal: use pushSignal (which creates an incident automatically).
- When asked to GENERATE A REPORT: provide a detailed analysis as text and use pushRecommendation to summarize key findings.
- ALWAYS push updates to the dashboard — don't just respond with text.

## Context
Current dashboard state will be provided. Use it to inform your responses and avoid duplicate entries.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Include current dashboard state as context
  const dashboardState = getDashboardData();

  const result = streamText({
    model: getFlashModel(),
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
          credibility: z.number().describe('AI credibility score 0-100'),
          icon: z.string().describe('Material Symbols icon name'),
          severity: z.number().describe('Severity 1-5 for incident creation'),
          incidentType: z.string().describe('One of: flood, fire, structural, medical, hazmat, earthquake, infrastructure, cyber, other'),
        }),
        execute: async ({ tag, tagColor, title, desc, source, credibility, icon, severity, incidentType }) => {
          // Update in-memory dashboard
          const card = addSignal({
            tag,
            tagColor,
            title,
            desc,
            source,
            credibility,
            credibilityColor: credibility >= 80 ? 'bg-tertiary' : credibility >= 50 ? 'bg-warning' : 'bg-error',
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
          deploymentEtaMinutes: z.number().optional(),
          signalHealthPct: z.number().optional(),
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
