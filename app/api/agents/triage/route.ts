/**
 * Canary — Triage Agent API Route
 *
 * POST /api/agents/triage
 *
 * Performs root cause analysis, blast radius assessment, RTO/RPO estimation,
 * and resource prioritization for an incident.
 */

import { runTriageAgent } from '@/lib/agents/triage';
import { addActivity, updateRecommendation, setProtocolSteps } from '@/lib/data/store';
import { z } from 'zod';

export const maxDuration = 120;

const TriageRouteSchema = z.object({
  incidentId: z.string().uuid(),
  priority: z.enum(['critical', 'high', 'normal']).default('normal'),
  additionalContext: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = TriageRouteSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    const result = await runTriageAgent(parsed.data);

    // Push triage results to the live dashboard
    addActivity(
      'Triage Agent',
      `Analysis complete: ${result.rootCause} (confidence: ${Math.round(result.rootCauseConfidence * 100)}%)`,
    );

    // Update recommendation panel with triage findings
    const recStats: { label: string; value: string }[] = [];
    if (result.affectedPopulation) {
      recStats.push({ label: 'Affected Population', value: `${result.affectedPopulation.min}–${result.affectedPopulation.max}` });
    }
    recStats.push({ label: 'Est. Recovery', value: `${result.rtoEstimateMinutes} min` });
    recStats.push({ label: 'Severity', value: `Level ${result.validatedSeverity}` });
    recStats.push({ label: 'Confidence', value: `${Math.round(result.rootCauseConfidence * 100)}%` });

    updateRecommendation({
      actionSequence: result.immediateActions.join('; '),
      confidenceScore: Math.round(result.rootCauseConfidence * 100),
      stats: recStats,
      ctaLabel: result.shouldEscalateToHuman ? 'Escalate to Commander' : 'Approve Dispatch',
    });

    // Set protocol steps from immediate actions
    setProtocolSteps(
      result.immediateActions.map((action, i) => ({
        step: action,
        done: false,
        active: i === 0,
      })),
    );

    if (result.shouldEscalateToHuman) {
      addActivity('Triage Agent', `ESCALATION: ${result.escalationReason}`);
    }

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[triage] agent error', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'AGENT_ERROR',
          message: error instanceof Error ? error.message : 'Triage agent failed',
        },
      },
      { status: 500 },
    );
  }
}
