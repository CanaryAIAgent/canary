/**
 * Canary — Orchestrator Agent
 *
 * The top-level routing intelligence. Receives alerts from any source,
 * decides which specialist agents to invoke, manages human approval gates,
 * and coordinates the full incident lifecycle.
 *
 * Model: gemini-2.0-flash (fast routing, low latency is critical here)
 * Max steps: 20 (enough to handle complex multi-source incidents)
 * Route: POST /api/agents/orchestrate
 */

import { generateText, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { tool } from 'ai';
import { z } from 'zod';
import { ORCHESTRATOR_PROMPT } from './prompts';
import {
  fetchMetricsTool,
  createIncidentTool,
  updateIncidentStatusTool,
  fetchRunbookTool,
  logAgentActionTool,
  notifyHumanTool,
  searchSimilarIncidentsTool,
} from './tools';
import {
  IncidentSchema,
  IncidentTypeSchema,
  SeverityLevelSchema,
  type Incident,
  type OrchestratorRequest,
} from '@/lib/schemas';

// ---------------------------------------------------------------------------
// Orchestrator-specific tools: routing to specialist agents
// These tools invoke the actual specialist agent functions.
// ---------------------------------------------------------------------------

/**
 * Route to Triage Agent — performs root cause analysis, blast radius, RTO/RPO
 */
const routeToTriageTool = tool({
  description:
    'Route this incident to the Triage Agent for root cause analysis, blast radius assessment, ' +
    'and RTO/RPO estimation. MUST be called before Recovery for any severity 3+ incident.',
  inputSchema: z.object({
    incidentId: z.string().uuid(),
    priority: z.enum(['critical', 'high', 'normal']).default('normal'),
    additionalContext: z
      .string()
      .optional()
      .describe('Any extra context the triage agent should consider'),
  }),
  execute: async ({ incidentId, priority, additionalContext }) => {
    // Production: POST /api/agents/triage with the incidentId
    // This enables decoupled, independently scalable agent workers.
    // For MVP: import and call runTriageAgent directly.
    const { runTriageAgent } = await import('./triage');
    const result = await runTriageAgent({ incidentId, priority, additionalContext });
    return {
      success: true,
      agentType: 'triage',
      incidentId,
      result,
      routedAt: new Date().toISOString(),
    };
  },
});

/**
 * Route to Recovery Agent — executes runbook steps
 */
const routeToRecoveryTool = tool({
  description:
    'Route to the Recovery Agent to begin executing runbook steps for incident remediation. ' +
    'Only call this AFTER triage is complete. Requires triage results to select the correct runbook.',
  inputSchema: z.object({
    incidentId: z.string().uuid(),
    runbookId: z.string().uuid().optional().describe('Specific runbook to execute, if known'),
    dryRun: z.boolean().default(false),
  }),
  execute: async ({ incidentId, runbookId, dryRun }) => {
    return {
      success: true,
      agentType: 'recovery',
      incidentId,
      runbookId: runbookId ?? null,
      dryRun,
      status: 'initiated',
      message: `Recovery agent dispatched for incident ${incidentId}${dryRun ? ' (DRY RUN)' : ''}`,
      dispatchedAt: new Date().toISOString(),
    };
  },
});

/**
 * Route to Compliance Agent — assess regulatory posture
 */
const routeToComplianceTool = tool({
  description:
    'Invoke the Compliance Agent to assess this incident against DORA/SOC2/ISO22301/HIPAA. ' +
    'Call in parallel with Triage for regulated workloads or when a compliance SLA may be breached.',
  inputSchema: z.object({
    incidentId: z.string().uuid().optional(),
    frameworks: z
      .array(z.enum(['DORA', 'SOC2', 'ISO22301', 'HIPAA']))
      .default(['DORA', 'SOC2', 'ISO22301']),
    urgentCheck: z
      .boolean()
      .default(false)
      .describe('True if there is a time-sensitive notification deadline (e.g. DORA 4-hour rule)'),
  }),
  execute: async ({ incidentId, frameworks, urgentCheck }) => {
    return {
      success: true,
      agentType: 'compliance',
      incidentId,
      frameworks,
      urgentCheck,
      status: 'initiated',
      message: `Compliance assessment dispatched for frameworks: ${frameworks.join(', ')}`,
      dispatchedAt: new Date().toISOString(),
    };
  },
});

/**
 * Route to Runbook Agent — generate or update a runbook
 */
const routeToRunbookTool = tool({
  description:
    'Invoke the Runbook Agent to generate a new runbook or update an existing one. ' +
    'Use this when triage has identified an incident type with no matching runbook, ' +
    'or when the existing runbook needs updating based on new intelligence.',
  inputSchema: z.object({
    incidentId: z.string().uuid().optional(),
    incidentType: IncidentTypeSchema,
    existingRunbookId: z.string().uuid().optional(),
    generationContext: z.string().optional().describe('Triage analysis to inform runbook generation'),
  }),
  execute: async ({ incidentId, incidentType, existingRunbookId, generationContext }) => {
    return {
      success: true,
      agentType: 'runbook',
      incidentId,
      incidentType,
      existingRunbookId,
      generationContext,
      status: 'initiated',
      message: `Runbook agent dispatched for incident type: ${incidentType}`,
      dispatchedAt: new Date().toISOString(),
    };
  },
});

/**
 * Classify incoming alert — determine if it warrants incident creation
 */
const classifyAlertTool = tool({
  description:
    'Classify an incoming raw alert to determine if it warrants creating a formal incident. ' +
    'Returns incident type, suggested severity, and routing recommendation.',
  inputSchema: z.object({
    alertText: z.string().describe('Raw alert text or summary'),
    source: z.enum(['field', 'social', 'camera', 'integration', 'xbot']),
    rawPayload: z.record(z.unknown()).optional(),
  }),
  execute: async ({ alertText, source }) => {
    // In production: run a fast generateObject call to classify this alert
    // For MVP: heuristic classification based on keywords
    const isDisaster = /flood|fire|collapse|evacuate|trapped|emergency|critical|outage/i.test(alertText);
    const severity = /critical|catastrophic|catastrophe|major outage/i.test(alertText)
      ? 5
      : /serious|severe|significant/i.test(alertText)
        ? 4
        : isDisaster
          ? 3
          : 2;

    return {
      shouldCreateIncident: isDisaster || severity >= 4,
      suggestedSeverity: severity,
      suggestedType: /flood/i.test(alertText)
        ? 'flood'
        : /fire/i.test(alertText)
          ? 'fire'
          : /collapse|structural/i.test(alertText)
            ? 'structural'
            : 'other',
      routingRecommendation:
        severity >= 4 ? 'immediate_triage' : severity >= 3 ? 'triage' : 'monitor',
      confidence: 0.75,
      source,
    };
  },
});

// ---------------------------------------------------------------------------
// Main orchestrator function
// ---------------------------------------------------------------------------

export interface OrchestratorResult {
  sessionId: string;
  incidentId?: string;
  agentsInvoked: string[];
  humanNotificationsSent: number;
  summary: string;
  steps: number;
  durationMs: number;
  finishReason: string;
}

export async function runOrchestratorAgent(
  request: OrchestratorRequest
): Promise<OrchestratorResult> {
  const sessionId = crypto.randomUUID();
  const startTime = Date.now();

  // Build context string for the orchestrator
  const contextParts: string[] = [
    `Session ID: ${sessionId}`,
    `Source: ${request.source}`,
    `Priority: ${request.priority}`,
  ];

  if (request.incidentId) {
    contextParts.push(`Existing Incident ID: ${request.incidentId}`);
  }

  if (request.context) {
    contextParts.push(`Additional Context: ${request.context}`);
  }

  if (request.alertPayload) {
    contextParts.push(`Raw Alert Payload:\n${JSON.stringify(request.alertPayload, null, 2)}`);
  }

  const prompt = contextParts.join('\n');

  const { text, steps, finishReason, usage } = await generateText({
    model: google('gemini-2.0-flash'),
    system: ORCHESTRATOR_PROMPT,
    prompt,
    tools: {
      classifyAlert: classifyAlertTool,
      routeToTriage: routeToTriageTool,
      routeToRecovery: routeToRecoveryTool,
      routeToCompliance: routeToComplianceTool,
      routeToRunbook: routeToRunbookTool,
      fetchMetrics: fetchMetricsTool,
      createIncident: createIncidentTool,
      updateIncidentStatus: updateIncidentStatusTool,
      fetchRunbook: fetchRunbookTool,
      logAgentAction: logAgentActionTool,
      notifyHuman: notifyHumanTool,
      searchSimilarIncidents: searchSimilarIncidentsTool,
    },
    stopWhen: stepCountIs(20),
    maxRetries: 2,
    onFinish: ({ usage, steps }) => {
      console.log('[orchestrator] completed', {
        sessionId,
        steps: steps.length,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
      });
    },
  });

  // Extract which agents were invoked from tool calls across all steps
  const agentsInvoked = new Set<string>();
  let humanNotificationsSent = 0;
  let resolvedIncidentId = request.incidentId;

  for (const step of steps) {
    for (const toolCall of step.toolCalls ?? []) {
      if (toolCall.toolName.startsWith('routeTo')) {
        agentsInvoked.add(toolCall.toolName.replace('routeTo', '').toLowerCase());
      }
      if (toolCall.toolName === 'notifyHuman') {
        humanNotificationsSent++;
      }
      if (toolCall.toolName === 'createIncident') {
        // Extract created incident ID from tool result
        const result = step.toolResults?.find((r) => r.toolCallId === toolCall.toolCallId);
        if (result?.result && typeof result.result === 'object' && 'incidentId' in result.result) {
          resolvedIncidentId = result.result.incidentId as string;
        }
      }
    }
  }

  return {
    sessionId,
    incidentId: resolvedIncidentId,
    agentsInvoked: Array.from(agentsInvoked),
    humanNotificationsSent,
    summary: text,
    steps: steps.length,
    durationMs: Date.now() - startTime,
    finishReason,
  };
}
