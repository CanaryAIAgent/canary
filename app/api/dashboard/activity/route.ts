/**
 * POST /api/dashboard/activity
 *
 * Adds an entry to the in-memory activity feed.
 * Used by the client to log user actions (chat messages, button clicks, etc.)
 */

import { addActivity } from '@/lib/data/store';

export async function POST(req: Request) {
  try {
    const { actor, action } = await req.json();

    if (!actor || !action) {
      return Response.json({ success: false, error: 'actor and action required' }, { status: 400 });
    }

    const entry = addActivity(actor, action);
    return Response.json({ success: true, activityId: entry.id });
  } catch (error) {
    console.error('[dashboard/activity] error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
