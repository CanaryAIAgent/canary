/**
 * Canary — Incident Listing
 *
 * GET /api/incidents — returns non-closed incidents for selectors/dropdowns
 */

import { dbListIncidents } from '@/lib/db';

export async function GET() {
  try {
    const incidents = await dbListIncidents({
      status: ['new', 'triaging', 'responding', 'escalated'],
      limit: 50,
    });

    const data = incidents.map((inc) => ({
      id: inc.id,
      title: inc.title,
      type: inc.type,
      severity: inc.severity,
      status: inc.status,
      createdAt: inc.createdAt,
    }));

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('[GET /api/incidents] error:', error);
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: error instanceof Error ? error.message : 'Failed to list incidents' } },
      { status: 500 },
    );
  }
}
