/**
 * Canary — EOC AI Chat Assistant
 *
 * POST /api/chat
 *
 * Streaming chat endpoint for the EOC command dashboard AI panel.
 * The assistant has access to all agent tools: it can triage incidents,
 * check shelter capacity, search historical incidents, and more.
 */

import { streamText, UIMessage, convertToModelMessages, tool } from 'ai';
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
- pushSignal: Add a new signal card to the dashboard feed
- pushActivity: Log an action to the field activity feed
- pushRecommendation: Update the AI strategy recommendation panel
- updateDashboardStats: Update the key metrics row

When you analyze a new report or make a recommendation, push the relevant updates so the dashboard stays current.

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
    tools: {
      // Dashboard mutation tools
      pushSignal: tool({
        description: 'Push a new signal card to the live EOC dashboard signal feed. Use this when you identify a new signal from a field report, social media post, or camera alert.',
        inputSchema: z.object({
          tag: z.string().describe('Signal category tag, e.g. "CRITICAL // FIELD", "LIVE // CAMERA", "SOCIAL // X"'),
          tagColor: z.enum(['text-error', 'text-tertiary', 'text-on-surface-variant']),
          title: z.string().describe('Signal title, e.g. "Structural Collapse — Oak St"'),
          desc: z.string().describe('Signal description'),
          source: z.string().describe('Signal source, e.g. "Field Responder", "Camera Feed AI", "Social Intelligence"'),
          credibility: z.number().min(0).max(100).describe('AI credibility score 0-100'),
          icon: z.string().describe('Material Symbols icon name, e.g. "apartment", "videocam", "person_search"'),
        }),
        execute: async ({ tag, tagColor, title, desc, source, credibility, icon }) => {
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
          return { success: true, signalId: card.id, message: `Signal "${title}" pushed to dashboard` };
        },
      }),

      pushActivity: tool({
        description: 'Log an action to the EOC field activity feed. Use this when you take an action, make a decision, or observe something noteworthy.',
        inputSchema: z.object({
          actor: z.string().describe('Who performed the action, e.g. "Triage Agent", "Orchestrator", "EOC Base"'),
          action: z.string().describe('Description of the action taken'),
        }),
        execute: async ({ actor, action }) => {
          const entry = addActivity(actor, action);
          return { success: true, activityId: entry.id };
        },
      }),

      pushRecommendation: tool({
        description: 'Update the AI strategy recommendation panel on the dashboard. Use this when you have a clear action recommendation for the incident commander.',
        inputSchema: z.object({
          actionSequence: z.string().describe('The recommended sequence of actions'),
          confidenceScore: z.number().min(0).max(100).describe('Confidence in this recommendation (0-100)'),
          stats: z.array(z.object({
            label: z.string(),
            value: z.string(),
          })).describe('Key stats to display (e.g. affected residents, response time)'),
          ctaLabel: z.string().default('Approve Dispatch').describe('Call-to-action button label'),
        }),
        execute: async ({ actionSequence, confidenceScore, stats: recStats, ctaLabel }) => {
          updateRecommendation({ actionSequence, confidenceScore, stats: recStats, ctaLabel });
          return { success: true, message: 'Recommendation panel updated' };
        },
      }),

      updateDashboardStats: tool({
        description: 'Update the key metrics row at the top of the EOC dashboard.',
        inputSchema: z.object({
          activeIncidents: z.number().int().nonnegative().optional(),
          incidentDelta: z.string().optional().describe('e.g. "+2/hr"'),
          resourceRequests: z.number().int().nonnegative().optional(),
          resourceStatus: z.string().optional().describe('e.g. "Pending", "Dispatched"'),
          deploymentEtaMinutes: z.number().nonnegative().optional(),
          signalHealthPct: z.number().min(0).max(100).optional(),
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
            done: z.boolean().default(false),
            active: z.boolean().optional().describe('Currently being worked on'),
          })),
        }),
        execute: async ({ steps }) => {
          setProtocolSteps(steps);
          return { success: true, message: `Protocol set with ${steps.length} steps` };
        },
      }),

      // Agent tools — inherited from the agent system
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
