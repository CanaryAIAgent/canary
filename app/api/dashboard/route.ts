/**
 * Canary — Dashboard Data API Route
 *
 * GET /api/dashboard
 *
 * Returns all in-memory EOC dashboard data: stats, signals, activity log,
 * protocol steps, and AI recommendation. Always fresh — no caching.
 */

import { getDashboardData } from '@/lib/data/store';

export async function GET() {
  const data = getDashboardData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
