/**
 * Canary — Incident Detail API
 *
 * GET /api/incidents/[id]
 *
 * Returns a single incident from Supabase with its recent agent_logs.
 */

import { NextRequest } from 'next/server';
import { dbGetIncident, dbListAgentLogs } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/incidents/[id]'>,
) {
  const { id } = await ctx.params;

  try {
    const incident = await dbGetIncident(id);

    if (!incident) {
      return Response.json(
        { error: 'Incident not found' },
        { status: 404 },
      );
    }

    // Fetch agent logs for this incident
    const allLogs = await dbListAgentLogs({ limit: 50 });
    const incidentLogs = allLogs.filter((log) => log.incidentId === id);

    return Response.json(
      { incident, agentLogs: incidentLogs },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[api/incidents/[id]] Error:', err);
    return Response.json(
      { error: 'Failed to fetch incident' },
      { status: 500 },
    );
  }
}
