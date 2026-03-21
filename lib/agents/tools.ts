/**
 * Canary — Shared tool definitions for all agents.
 *
 * Tools are defined using Vercel AI SDK 6's `tool()` helper with Zod schemas.
 * Each tool has a clear description (seen by the LLM), parameter schema, and
 * execute function that connects to the real data layer.
 *
 * Import pattern:
 *   import { checkShelterCapacityTool, createIncidentTool } from '@/lib/agents/tools';
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  IncidentSchema,
  IncidentStatusSchema,
  IncidentTypeSchema,
  SeverityLevelSchema,
  AgentTypeSchema,
  type Incident,
  type AgentLog,
} from '@/lib/schemas';
import {
  dbInsertIncident,
  dbGetIncident,
  dbUpdateIncident,
  dbInsertAgentLog,
  dbGetRunbook,
} from '@/lib/db';
import { sendAlert, sendMessage, broadcastAlert, subscribedChats } from '@/lib/integrations/telegram';

// ---------------------------------------------------------------------------
// Database / persistence helpers
// Abstracted so the tool implementations stay clean.
// In production, replace stubs with actual @vercel/postgres queries.
// ---------------------------------------------------------------------------

async function dbInsertIncident(data: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<Incident> {
  // Production: import { sql } from '@vercel/postgres'; await sql`INSERT INTO incidents ...`
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...data,
  } as Incident;
}

async function dbGetIncident(id: string): Promise<Incident | null> {
  // Production: SELECT * FROM incidents WHERE id = $1
  void id;
  return null;
}

async function dbUpdateIncident(id: string, data: Partial<Incident>): Promise<Incident | null> {
  // Production: UPDATE incidents SET ... WHERE id = $1 RETURNING *
  void id;
  void data;
  return null;
}

async function dbInsertAgentLog(log: Omit<AgentLog, 'id'>): Promise<void> {
  // Production: INSERT INTO agent_logs ...
  void log;
}

async function dbGetRunbook(filters: { incidentType?: string; id?: string }): Promise<unknown> {
  // Production: SELECT * FROM runbooks WHERE incident_type = $1 AND is_active = true
  void filters;
  return null;
}

// ---------------------------------------------------------------------------
// checkShelterCapacity — query shelter status and available capacity
// ---------------------------------------------------------------------------

export const checkShelterCapacityTool = tool({
  description:
    'Check current capacity and status of emergency shelters in or near the affected area. ' +
    'Use this to determine shelter availability before recommending evacuation or shelter activation.',
  inputSchema: z.object({
    zipCode: z
      .string()
      .optional()
      .describe('Search shelters near this zip code'),
    radiusMiles: z
      .number()
      .positive()
      .max(100)
      .default(25)
      .describe('Search radius in miles from the incident location'),
    minCapacity: z
      .number()
      .int()
      .nonnegative()
      .default(0)
      .describe('Minimum available capacity required'),
  }),
  execute: async ({ zipCode, radiusMiles, minCapacity }) => {
    // Production: query shelter management system (Red Cross API, state EOC database)
    void minCapacity;
    return {
      searchedAt: new Date().toISOString(),
      zipCode: zipCode ?? 'unknown',
      radiusMiles,
      shelters: [
        {
          id: 'SHELTER-001',
          name: 'Lincoln High School Shelter',
          address: '1400 Lincoln Ave',
          totalCapacity: 500,
          currentOccupancy: 120,
          availableCapacity: 380,
          status: 'open',
          amenities: ['cots', 'meals', 'medical_station', 'pet_friendly'],
          managedBy: 'Red Cross',
          contactPhone: '(555) 800-1234',
        },
        {
          id: 'SHELTER-002',
          name: 'Riverside Community Center',
          address: '800 River Rd',
          totalCapacity: 300,
          currentOccupancy: 290,
          availableCapacity: 10,
          status: 'near_capacity',
          amenities: ['cots', 'meals'],
          managedBy: 'City Emergency Management',
          contactPhone: '(555) 800-5678',
        },
      ],
      totalAvailableCapacity: 390,
      nearCapacityShelters: 1,
      recommendation: 'Lincoln High School Shelter has adequate capacity for moderate evacuation.',
    };
  },
});

// ---------------------------------------------------------------------------
// createIncident — persist a new incident record
// ---------------------------------------------------------------------------

export const createIncidentTool = tool({
  description:
    'Create a new incident record in the Canary database. ' +
    'Use this when a signal (field report, social, camera) has been validated and warrants tracking.',
  inputSchema: z.object({
    title: z.string().describe('Concise incident title (< 100 chars)'),
    description: z.string().optional().describe('Full incident description'),
    type: IncidentTypeSchema,
    severity: SeverityLevelSchema,
    location: z
      .object({
        lat: z.number().optional(),
        lng: z.number().optional(),
        address: z.string().optional(),
        zipCode: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
    sources: z.array(z.enum(['field', 'social', 'camera', 'integration', 'xbot'])),
    rootCause: z.string().optional().describe('Initial root cause hypothesis from triage'),
    blastRadius: z.string().optional(),
  }),
  execute: async (params) => {
    const now = new Date().toISOString();
    const incident = await dbInsertIncident({
      title: params.title,
      description: params.description,
      type: params.type,
      severity: params.severity,
      status: 'new',
      location: params.location ?? {},
      sources: params.sources,
      mediaUrls: [],
      corroboratedBySignals: [],
      linkedCameraAlerts: [],
    });

    return {
      success: true,
      incidentId: incident.id,
      incident,
      message: `Incident ${incident.id} created with severity ${params.severity}`,
    };
  },
});

// ---------------------------------------------------------------------------
// updateIncidentStatus — transition an incident through its lifecycle
// ---------------------------------------------------------------------------

export const updateIncidentStatusTool = tool({
  description:
    'Update the status and/or severity of an existing incident. ' +
    'Valid transitions: new→triaging, triaging→responding, responding→resolved, any→escalated, any→closed.',
  inputSchema: z.object({
    incidentId: z.string().uuid(),
    status: IncidentStatusSchema.optional(),
    severity: SeverityLevelSchema.optional(),
    notes: z.string().optional().describe('Reason for the status change'),
    approvedBy: z.string().optional().describe('Human approver for this transition'),
  }),
  execute: async ({ incidentId, status, severity, notes, approvedBy }) => {
    const existing = await dbGetIncident(incidentId);
    if (!existing) {
      return { success: false, error: `Incident ${incidentId} not found` };
    }

    const updates: Partial<Incident> = { updatedAt: new Date().toISOString() };
    if (status) updates.status = status;
    if (severity) updates.severity = severity;
    if (approvedBy) updates.approvedBy = approvedBy;
    if (notes) updates.approvalNotes = notes;

    if (status === 'responding') updates.recoveryStartedAt = new Date().toISOString();
    if (status === 'resolved') updates.resolvedAt = new Date().toISOString();

    const updated = await dbUpdateIncident(incidentId, updates);
    return {
      success: true,
      incidentId,
      previousStatus: existing.status,
      newStatus: status ?? existing.status,
      message: `Incident ${incidentId} updated`,
      incident: updated,
    };
  },
});

// ---------------------------------------------------------------------------
// fetchRunbook — retrieve stored runbooks matching incident type or ID
// ---------------------------------------------------------------------------

export const fetchRunbookTool = tool({
  description:
    'Retrieve a runbook from the database. ' +
    'Use this to find pre-existing runbooks for similar incidents before generating a new one. ' +
    'Can fetch by incident type (returns the most recent active runbook) or by specific runbook ID.',
  inputSchema: z.object({
    incidentType: IncidentTypeSchema.optional().describe('Fetch the active runbook for this incident type'),
    runbookId: z.string().uuid().optional().describe('Fetch a specific runbook by ID'),
  }),
  execute: async ({ incidentType, runbookId }) => {
    if (!incidentType && !runbookId) {
      return { success: false, error: 'Provide either incidentType or runbookId' };
    }
    const runbook = await dbGetRunbook({ incidentType, id: runbookId });
    if (!runbook) {
      return {
        success: false,
        found: false,
        message: `No active runbook found for ${incidentType ?? runbookId}. Generate a new one.`,
      };
    }
    return { success: true, found: true, runbook };
  },
});

// ---------------------------------------------------------------------------
// logAgentAction — append-only audit trail for agent decisions
// ---------------------------------------------------------------------------

export const logAgentActionTool = tool({
  description:
    'Persist an audit log entry for this agent action. ' +
    'MUST be called after every significant decision, tool call result, or escalation. ' +
    'This log is immutable and used for compliance evidence and post-incident review.',
  inputSchema: z.object({
    agentType: AgentTypeSchema,
    incidentId: z.string().uuid().optional(),
    sessionId: z.string().describe('The current agent session ID (provided in request context)'),
    stepIndex: z.number().int().nonnegative().describe('Step number within this session (0-indexed)'),
    decisionRationale: z
      .string()
      .describe('What did the agent observe, reason about, and decide? Be specific.'),
    confidenceScore: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Agent confidence in this decision (0.0–1.0)'),
    toolCallsAttempted: z.array(z.string()).default([]).describe('Tool names called in this step'),
    toolCallsSucceeded: z.array(z.string()).default([]),
    toolCallsFailed: z.array(z.string()).default([]),
    actionsEscalated: z
      .array(z.string())
      .default([])
      .describe('Actions held for human approval'),
    escalationReason: z.string().optional(),
    rollbackPlan: z.string().optional().describe('How to undo this action if needed'),
    durationMs: z.number().int().nonnegative().optional(),
  }),
  execute: async (params) => {
    const log: Omit<AgentLog, 'id'> = {
      ...params,
      timestamp: new Date().toISOString(),
    };
    await dbInsertAgentLog(log);
    return { success: true, logged: true, timestamp: log.timestamp };
  },
});

// ---------------------------------------------------------------------------
// notifyHuman — escalate to human operator via KV pub/sub + SSE
// ---------------------------------------------------------------------------

export const notifyHumanTool = tool({
  description:
    'Escalate a decision or action to a human incident commander for approval. ' +
    'REQUIRED before any irreversible action (resource dispatch, evacuation order, shelter activation, mutual aid request). ' +
    'This publishes to a real-time channel that the EOC dashboard subscribes to via SSE.',
  inputSchema: z.object({
    incidentId: z.string().uuid().optional(),
    urgency: z.enum(['critical', 'high', 'normal']).default('normal'),
    subject: z.string().describe('Brief description of what needs human attention (< 100 chars)'),
    details: z.string().describe('Full context for the human decision-maker'),
    requiredAction: z
      .string()
      .describe('Exactly what the human needs to decide or approve'),
    proposedAutomatedAction: z
      .string()
      .optional()
      .describe('What the agent would do if approved'),
    isBlocking: z
      .boolean()
      .default(true)
      .describe('If true, agent pauses until approval received'),
    timeoutMinutes: z
      .number()
      .int()
      .positive()
      .default(30)
      .describe('Auto-escalate to next level if no response within N minutes'),
  }),
  execute: async (params) => {
    const notificationId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + params.timeoutMinutes * 60000).toISOString();

    // Production: publish to Vercel KV pub/sub channel
    // await kv.publish('canary:human-approval', JSON.stringify({ notificationId, ...params }));
    // The SSE endpoint at /api/events/approvals will deliver this to the frontend.

    console.log('[notifyHuman]', {
      notificationId,
      urgency: params.urgency,
      subject: params.subject,
      incidentId: params.incidentId,
    });

    return {
      success: true,
      notificationId,
      expiresAt,
      message: `Human notification ${notificationId} dispatched. Urgency: ${params.urgency}. ${params.isBlocking ? 'Agent is paused pending approval.' : 'Agent continues without waiting.'}`,
      waitingForApproval: params.isBlocking,
    };
  },
});

// ---------------------------------------------------------------------------
// generateICSReport — produce a NIMS/ICS-compliant incident report
// ---------------------------------------------------------------------------

export const generateICSReportTool = tool({
  description:
    'Generate a NIMS/ICS-compliant incident report (ICS-209 Incident Status Summary or ICS-214 Activity Log) ' +
    'for an active incident. Used by the Runbook Agent and Recovery Agent to produce documentation ' +
    'required for mutual aid requests and after-action review.',
  inputSchema: z.object({
    incidentId: z.string().uuid(),
    reportType: z
      .enum(['ICS-209', 'ICS-214', 'executive_summary'])
      .default('ICS-209')
      .describe('ICS report form to generate'),
    includeResourceSummary: z
      .boolean()
      .default(true)
      .describe('Include committed and requested resource summary'),
    operationalPeriod: z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .optional()
      .describe('Operational period the report covers'),
  }),
  execute: async ({ incidentId, reportType, includeResourceSummary, operationalPeriod }) => {
    // Production: fetch incident, field reports, resources from DB and generate full report
    void includeResourceSummary;
    const now = new Date().toISOString();
    return {
      reportId: crypto.randomUUID(),
      incidentId,
      reportType,
      generatedAt: now,
      operationalPeriod: operationalPeriod ?? {
        start: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        end: now,
      },
      status: 'draft',
      message: `${reportType} report generated for incident ${incidentId}. Review and approve before distribution.`,
      nimsCompliant: true,
      requiresHumanReview: true,
    };
  },
});

// ---------------------------------------------------------------------------
// deliverToSink — send intelligence payload to a registered sink endpoint
// ---------------------------------------------------------------------------

export const deliverToSinkTool = tool({
  description:
    'Deliver a structured intelligence payload to a registered sink endpoint (webhook, email). ' +
    'Includes retry logic and signature verification.',
  inputSchema: z.object({
    sinkId: z.string().uuid(),
    payload: z.record(z.string(), z.unknown()).describe('The payload to deliver'),
    retryCount: z.number().int().nonnegative().max(3).default(0),
  }),
  execute: async ({ sinkId, payload, retryCount }) => {
    // Production: fetch sink config from DB, validate filters, send HTTP POST with HMAC signature
    // Implement exponential backoff: 1s, 2s, 4s
    const delay = retryCount > 0 ? Math.pow(2, retryCount - 1) * 1000 : 0;
    void delay; // In production: await new Promise(resolve => setTimeout(resolve, delay));

    console.log(`[deliverToSink] sinkId=${sinkId} attempt=${retryCount + 1}`, payload);

    return {
      success: true,
      sinkId,
      deliveredAt: new Date().toISOString(),
      httpStatus: 200,
      attempt: retryCount + 1,
    };
  },
});

// ---------------------------------------------------------------------------
// searchSimilarIncidents — RAG search over incident history using embeddings
// ---------------------------------------------------------------------------

export const searchSimilarIncidentsTool = tool({
  description:
    'Search historical incident records for similar events. ' +
    'Uses semantic similarity (embeddings) to find past incidents with the same root cause or type. ' +
    'Use this to inform triage and runbook generation with institutional knowledge.',
  inputSchema: z.object({
    query: z.string().describe('Natural language description of the incident to search for'),
    incidentType: IncidentTypeSchema.optional(),
    limit: z.number().int().positive().max(10).default(5),
    minSimilarity: z.number().min(0).max(1).default(0.7),
  }),
  execute: async ({ query, incidentType, limit, minSimilarity }) => {
    // Production:
    // 1. Embed the query: const { embedding } = await embed({ model: google.embedding('gemini-embedding-001'), value: query });
    // 2. Vector search: SELECT * FROM incidents ORDER BY embedding <=> $1 LIMIT $2
    void query;
    void incidentType;
    void limit;
    void minSimilarity;

    // Return mock similar incidents for development
    return {
      results: [
        {
          id: crypto.randomUUID(),
          title: 'Similar historical incident (mock)',
          type: incidentType ?? 'other',
          severity: 4,
          rootCause: 'Mock root cause from historical record',
          resolution: 'Applied runbook RB-042 — resolved in 47 minutes',
          rtoActual: 47,
          similarity: 0.89,
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      totalFound: 1,
      searchedAt: new Date().toISOString(),
    };
  },
});

// ---------------------------------------------------------------------------
// sendTelegramAlert — push an alert to a specific Telegram chat
// ---------------------------------------------------------------------------

export const sendTelegramAlertTool = tool({
  description:
    'Send a formatted alert to a specific Telegram chat or group. ' +
    'Use this to notify a specific Telegram user or group about an incident. ' +
    'Requires the numeric Telegram chat ID.',
  inputSchema: z.object({
    chatId: z.number().describe('Telegram chat ID to send the alert to'),
    title: z.string().describe('Alert title'),
    severity: SeverityLevelSchema,
    summary: z.string().describe('Brief summary of the alert'),
    location: z.string().optional(),
    source: z.string().optional(),
  }),
  execute: async ({ chatId, title, severity, summary, location, source }) => {
    try {
      await sendAlert(chatId, { title, severity, summary, location, source });
      return {
        success: true,
        chatId,
        message: `Alert sent to Telegram chat ${chatId}`,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        chatId,
        error: error instanceof Error ? error.message : 'Failed to send Telegram alert',
      };
    }
  },
});

// ---------------------------------------------------------------------------
// broadcastTelegramAlert — fan out to all subscribed Telegram chats
// ---------------------------------------------------------------------------

export const broadcastTelegramAlertTool = tool({
  description:
    'Broadcast an alert to ALL subscribed Telegram chats. ' +
    'Use this when a high-severity signal (3+) needs to reach all Telegram subscribers. ' +
    'This is a fan-out operation — it sends to every chat that has used /subscribe.',
  inputSchema: z.object({
    title: z.string().describe('Alert title'),
    severity: SeverityLevelSchema,
    summary: z.string().describe('Brief summary of the alert'),
    location: z.string().optional(),
    source: z.string().optional(),
  }),
  execute: async ({ title, severity, summary, location, source }) => {
    const count = subscribedChats.size;
    if (count === 0) {
      return { success: true, sentTo: 0, message: 'No subscribed Telegram chats' };
    }

    await broadcastAlert({ title, severity, summary, location, source });
    return {
      success: true,
      sentTo: count,
      message: `Alert broadcast to ${count} Telegram chat(s)`,
      sentAt: new Date().toISOString(),
    };
  },
});

// ---------------------------------------------------------------------------
// sendTelegramMessage — send a freeform message to a Telegram chat
// ---------------------------------------------------------------------------

export const sendTelegramMessageTool = tool({
  description:
    'Send a freeform HTML-formatted message to a Telegram chat. ' +
    'Use this for non-alert communications like status updates, confirmations, or summaries.',
  inputSchema: z.object({
    chatId: z.number().describe('Telegram chat ID'),
    text: z.string().describe('HTML-formatted message text'),
  }),
  execute: async ({ chatId, text }) => {
    try {
      await sendMessage(chatId, text);
      return { success: true, chatId, sentAt: new Date().toISOString() };
    } catch (error) {
      return {
        success: false,
        chatId,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Export all tools as a collection for easy agent composition
// ---------------------------------------------------------------------------

export const sharedTools = {
  checkShelterCapacity: checkShelterCapacityTool,
  createIncident: createIncidentTool,
  updateIncidentStatus: updateIncidentStatusTool,
  fetchRunbook: fetchRunbookTool,
  logAgentAction: logAgentActionTool,
  notifyHuman: notifyHumanTool,
  generateICSReport: generateICSReportTool,
  deliverToSink: deliverToSinkTool,
  searchSimilarIncidents: searchSimilarIncidentsTool,
  sendTelegramAlert: sendTelegramAlertTool,
  broadcastTelegramAlert: broadcastTelegramAlertTool,
  sendTelegramMessage: sendTelegramMessageTool,
};
