/**
 * Canary — Orchestrator Agent API Route
 *
 * POST /api/agents/orchestrate
 *
 * Receives raw alerts from any source (field, social, camera, integration)
 * and routes them through the orchestrator agent for classification,
 * triage, and response coordination.
 */

import { runOrchestratorAgent } from '@/lib/agents/orchestrator';
import { OrchestratorRequestSchema } from '@/lib/schemas';
import { addActivity, updateStats, addSignal } from '@/lib/data/store';

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = OrchestratorRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    const result = await runOrchestratorAgent(parsed.data);

    // Push updates to the live dashboard
    addActivity('Orchestrator', result.summary.slice(0, 200));

    if (result.agentsInvoked.length > 0) {
      addActivity('Orchestrator', `Invoked agents: ${result.agentsInvoked.join(', ')}`);
    }

    if (result.incidentId) {
      updateStats({ activeIncidents: (await import('@/lib/data/store')).stats.activeIncidents + 1 });
    }

    // Push the alert as a signal card
    if (parsed.data.alertPayload) {
      addSignal({
        tag: `${parsed.data.priority.toUpperCase()} // ${parsed.data.source.toUpperCase()}`,
        tagColor: parsed.data.priority === 'critical' ? 'text-error' : 'text-on-surface-variant',
        title: typeof parsed.data.alertPayload.title === 'string'
          ? parsed.data.alertPayload.title
          : 'Incoming Alert',
        desc: parsed.data.context ?? result.summary.slice(0, 150),
        source: parsed.data.source,
        credibility: 75,
        credibilityColor: 'bg-tertiary',
        time: 'just now',
        icon: parsed.data.source === 'camera' ? 'videocam'
          : parsed.data.source === 'social' ? 'person_search'
          : parsed.data.source === 'field' ? 'assignment'
          : 'sensors',
      });
    }

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[orchestrate] agent error', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'AGENT_ERROR',
          message: error instanceof Error ? error.message : 'Orchestrator agent failed',
        },
      },
      { status: 500 },
    );
  }
}
