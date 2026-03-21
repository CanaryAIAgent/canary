/**
 * Canary — Incident Detail API
 *
 * GET /api/incidents/[id]
 *
 * Returns a single incident from Supabase with its agent_logs
 * (including raw_step_json for expandable analysis views).
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

    // Fetch agent logs scoped to this incident
    const agentLogs = await dbListAgentLogs({ incidentId: id, limit: 100 });

    return Response.json(
      { incident, agentLogs },
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
