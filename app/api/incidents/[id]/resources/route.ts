/**
 * POST /api/incidents/[id]/resources
 *
 * Creates a resource request for the given incident.
 * Increments the dashboard resource request counter and logs activity.
 */

import { addResourceRequest } from '@/lib/data/store';
import { dbInsertAgentLog } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: incidentId } = await params;
    const { resourceType, quantity, priority, notes } = await req.json();

    if (!resourceType) {
      return Response.json({ success: false, error: 'resourceType is required' }, { status: 400 });
    }

    const description = `${quantity ?? 1}x ${resourceType}${priority ? ` (${priority})` : ''}${notes ? ` — ${notes}` : ''}`;

    // Update in-memory dashboard
    addResourceRequest(description);

    // Persist to agent_logs
    try {
      await dbInsertAgentLog({
        agentType: 'orchestrator',
        incidentId,
        sessionId: crypto.randomUUID(),
        stepIndex: 0,
        decisionRationale: `RESOURCE REQUEST: ${description}`,
        toolCallsAttempted: [],
        toolCallsSucceeded: [],
        toolCallsFailed: [],
        actionsEscalated: [],
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[resources] DB persist failed:', err);
    }

    return Response.json({
      success: true,
      data: { incidentId, resourceType, quantity: quantity ?? 1, priority, notes },
    });
  } catch (error) {
    console.error('[resources] error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
