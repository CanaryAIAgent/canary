/**
 * Canary — Dashboard Data API Route
 *
 * GET /api/dashboard
 *
 * Returns EOC dashboard data hydrated from Supabase, with in-memory fallback.
 * Always fresh — no caching.
 */

import { getDashboardData, syncDashboardFromDb } from '@/lib/data/store';

export async function GET() {
  let data;
  try {
    data = await syncDashboardFromDb();
  } catch {
    // Supabase unavailable — fall back to in-memory state
    data = getDashboardData();
  }

  return Response.json(data, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
