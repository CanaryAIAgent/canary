/**
 * POST /api/dashboard/approve
 *
 * Approves the AI recommendation for the active incident:
 * - Updates incident status to 'responding'
 * - Logs the approval in agent_logs
 * - Returns the updated incident
 */

import { dbListIncidents, dbUpdateIncident, dbInsertAgentLog } from '@/lib/db';
import { addActivity } from '@/lib/data/store';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const incidentId = body.incidentId as string | undefined;

    // Find the target incident
    let target;
    if (incidentId) {
      const incidents = await dbListIncidents({ status: ['new', 'triaging', 'responding', 'escalated'], limit: 100 });
      target = incidents.find((i) => i.id === incidentId);
    } else {
      // Find the one with ai_analysis.recommendation
      const incidents = await dbListIncidents({ status: ['new', 'triaging', 'responding', 'escalated'], limit: 100 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      target = incidents.find((i) => (i.aiAnalysis as any)?.recommendation != null)
        ?? incidents.sort((a, b) => b.severity - a.severity)[0];
    }

    if (!target) {
      return Response.json({ success: false, error: 'No active incident found' }, { status: 404 });
    }

    // Update status to responding
    const updated = await dbUpdateIncident(target.id, {
      status: 'responding',
      approvedBy: 'Incident Commander',
      approvalNotes: `Approved AI recommendation at ${new Date().toISOString()}`,
    });

    // Log the approval
    await dbInsertAgentLog({
      agentType: 'orchestrator',
      incidentId: target.id,
      sessionId: crypto.randomUUID(),
      stepIndex: 0,
      decisionRationale: `APPROVED by Incident Commander: ${target.title}. Status changed to responding.`,
      confidenceScore: 1.0,
      toolCallsAttempted: [],
      toolCallsSucceeded: [],
      toolCallsFailed: [],
      actionsEscalated: [],
      timestamp: new Date().toISOString(),
    });

    // Update in-memory activity feed so it shows immediately
    addActivity('Incident Commander', `Approved dispatch for "${target.title}" — status → responding`);

    return Response.json({
      success: true,
      data: {
        incidentId: target.id,
        previousStatus: target.status,
        newStatus: 'responding',
        title: target.title,
      },
    });
  } catch (error) {
    console.error('[dashboard/approve] error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
