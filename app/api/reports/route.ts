/**
 * GET /api/reports
 *
 * Returns all incidents that have generated swarm reports (insurance, emergency, research).
 * Used by the /reports listing page.
 */

import { dbListIncidents } from '@/lib/db';

export async function GET() {
  try {
    // Fetch all incidents (including resolved) that might have reports
    const incidents = await dbListIncidents({
      limit: 100,
    });

    // Filter to only those with swarm reports
    const withReports = incidents
      .filter((inc) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const analysis = inc.aiAnalysis as any;
        return analysis?.swarmReports != null;
      })
      .map((inc) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const analysis = inc.aiAnalysis as any;
        const swarm = analysis.swarmReports ?? {};
        return {
          id: inc.id,
          title: inc.title,
          type: inc.type,
          severity: inc.severity,
          status: inc.status,
          createdAt: inc.createdAt,
          reports: {
            insurance: swarm.insurance ? { generatedAt: swarm.insurance.generatedAt } : null,
            emergency: swarm.emergency ? { generatedAt: swarm.emergency.generatedAt } : null,
            research: swarm.research ? { generatedAt: swarm.research.generatedAt } : null,
          },
        };
      });

    return Response.json({ success: true, data: withReports });
  } catch (error) {
    console.error('[GET /api/reports] error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
