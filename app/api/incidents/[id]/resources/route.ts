/**
 * POST /api/incidents/[id]/resources
 *
 * Creates a resource request for the given incident.
 * Persists to the resource_requests table, updates dashboard stats, and logs activity.
 */

import { addActivity, updateStats, stats } from '@/lib/data/store';
import { dbInsertResourceRequest } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: incidentId } = await params;
    const { resourceType, quantity, priority, notes } = await req.json();

    if (!resourceType) {
      return Response.json({ success: false, error: 'resourceType is required' }, { status: 400 });
    }

    // Persist to resource_requests table
    const request = await dbInsertResourceRequest({
      incidentId,
      resourceType,
      quantity: quantity ?? 1,
      priority: priority ?? 'standard',
      description: notes ?? undefined,
      requestedBy: 'Incident Commander',
    });

    // Update in-memory dashboard
    updateStats({ resourceRequests: stats.resourceRequests + 1, resourceStatus: 'Pending' });
    const description = `${quantity ?? 1}x ${resourceType}${priority ? ` (${priority})` : ''}${notes ? ` — ${notes}` : ''}`;
    addActivity('Incident Commander', `Resource request: ${description}`);

    return Response.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('[resources] error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
