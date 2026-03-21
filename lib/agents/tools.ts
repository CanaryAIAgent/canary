/**
 * Canary — Shared tool definitions for all agents.
 *
 * Tools are defined using Vercel AI SDK 6's `tool()` helper with Zod schemas.
 * Each tool has a clear description (seen by the LLM), parameter schema, and
 * execute function that connects to the real data layer.
 *
 * Import pattern:
 *   import { fetchMetricsTool, createIncidentTool } from '@/lib/agents/tools';
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
// fetchMetrics — query monitoring integrations for system health data
// ---------------------------------------------------------------------------

export const fetchMetricsTool = tool({
  description:
    'Fetch system health metrics from monitoring integrations (CloudWatch, Datadog, Prometheus). ' +
    'Use this before triage to understand the technical state of affected systems.',
  inputSchema: z.object({
    source: z
      .enum(['cloudwatch', 'datadog', 'prometheus', 'mock'])
      .default('mock')
      .describe('Monitoring source to query'),
    resourceId: z
      .string()
      .describe('Resource identifier (e.g. EC2 instance ID, RDS cluster, Kubernetes namespace)'),
    metrics: z
      .array(z.string())
      .describe('Metric names to fetch (e.g. ["CPUUtilization", "DatabaseConnections"])'),
    windowMinutes: z
      .number()
      .int()
      .positive()
      .max(1440)
      .default(15)
      .describe('Time window in minutes for the metric query'),
  }),
  execute: async ({ source, resourceId, metrics, windowMinutes }) => {
    if (source === 'mock') {
      // Return realistic mock metrics for development and demo
      return {
        source: 'mock',
        resourceId,
        windowMinutes,
        retrievedAt: new Date().toISOString(),
        metrics: metrics.map((name) => ({
          name,
          datapoints: Array.from({ length: Math.min(windowMinutes, 10) }, (_, i) => ({
            timestamp: new Date(Date.now() - (windowMinutes - i) * 60000).toISOString(),
            value: name.includes('CPU') ? 85 + Math.random() * 10 : Math.random() * 100,
            unit: name.includes('CPU') ? 'Percent' : 'Count',
          })),
          alarm: name.includes('CPU') ? 'ALARM' : 'OK',
          threshold: name.includes('CPU') ? 80 : null,
        })),
      };
    }

    // Production: call actual CloudWatch/Datadog/Prometheus APIs
    // These would be implemented in lib/integrations/cloudwatch.ts etc.
    throw new Error(`Integration ${source} not yet configured. Set API keys in environment.`);
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
    'Escalate a decision or action to a human operator for approval. ' +
    'REQUIRED before any irreversible action (failover, data restore, traffic cut). ' +
    'This publishes to a real-time channel that the frontend subscribes to via SSE.',
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
// fetchInfrastructureContext — retrieve IaC / topology context for runbook gen
// ---------------------------------------------------------------------------

export const fetchInfrastructureContextTool = tool({
  description:
    'Fetch infrastructure context for a system (Terraform state, Kubernetes topology, ' +
    'AWS resource inventory). Used by Runbook Agent to generate accurate recovery procedures.',
  inputSchema: z.object({
    systemId: z.string().describe('System or service identifier'),
    contextType: z
      .enum(['terraform', 'kubernetes', 'aws_inventory', 'topology', 'mock'])
      .default('mock'),
  }),
  execute: async ({ systemId, contextType }) => {
    if (contextType === 'mock') {
      return {
        systemId,
        contextType: 'mock',
        topology: {
          services: ['api-server', 'postgres-primary', 'postgres-replica', 'redis-cache', 'cdn'],
          region: 'us-east-1',
          availabilityZones: ['us-east-1a', 'us-east-1b'],
          criticalDependencies: ['postgres-primary', 'redis-cache'],
          rtoTarget: 60,
          rpoTarget: 15,
          hasFallback: true,
          backupRegion: 'us-west-2',
        },
        lastUpdated: new Date().toISOString(),
      };
    }
    // Production: fetch from IaC state store, Terraform Cloud, or internal CMDB
    throw new Error(`Infrastructure context type ${contextType} not yet configured.`);
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
    payload: z.record(z.unknown()).describe('The payload to deliver'),
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
// Export all tools as a collection for easy agent composition
// ---------------------------------------------------------------------------

export const sharedTools = {
  fetchMetrics: fetchMetricsTool,
  createIncident: createIncidentTool,
  updateIncidentStatus: updateIncidentStatusTool,
  fetchRunbook: fetchRunbookTool,
  logAgentAction: logAgentActionTool,
  notifyHuman: notifyHumanTool,
  fetchInfrastructureContext: fetchInfrastructureContextTool,
  deliverToSink: deliverToSinkTool,
  searchSimilarIncidents: searchSimilarIncidentsTool,
};
