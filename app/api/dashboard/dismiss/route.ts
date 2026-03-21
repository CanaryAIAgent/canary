/**
 * POST /api/dashboard/dismiss
 *
 * Clears the AI recommendation from the active incident's ai_analysis
 * so it doesn't reappear on the next dashboard poll.
 */

import { dbListIncidents, dbUpdateIncident } from '@/lib/db';

export async function POST() {
  try {
    const incidents = await dbListIncidents({
      status: ['new', 'triaging', 'responding', 'escalated'],
      limit: 100,
    });

    // Find the incident with ai_analysis.recommendation (the one powering the panel)
    const target = incidents.find((i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analysis = i.aiAnalysis as any;
      return analysis?.recommendation != null;
    });

    if (target) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = (target.aiAnalysis ?? {}) as any;
      delete existing.recommendation;
      await dbUpdateIncident(target.id, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        aiAnalysis: { ...existing, dismissedAt: new Date().toISOString() } as any,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[dashboard/dismiss] error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
