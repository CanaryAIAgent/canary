/**
 * Canary — AI Signal Ingestion
 *
 * POST /api/signals/ingest
 *
 * Accepts raw signals (field reports, social posts, camera alerts)
 * and uses AI to analyze, score credibility, classify severity,
 * and push results to the live dashboard.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getFlashModel } from '@/lib/ai/config';
import { addSignal, addActivity, updateStats, stats } from '@/lib/data/store';
import { dbInsertIncident } from '@/lib/db';
import { broadcastAlert } from '@/lib/integrations/telegram';

export const maxDuration = 30;

const IngestRequestSchema = z.object({
  type: z.enum(['field', 'social', 'camera']),
  text: z.string().min(1).describe('Raw signal text — field report, social post, or camera alert description'),
  source: z.string().optional().describe('Source identifier, e.g. "Field Team Alpha", "@user123", "CAM-047"'),
  mediaUrl: z.string().url().optional(),
});

const SignalAnalysisSchema = z.object({
  isEmergency: z.boolean(),
  severity: z.number().describe('Severity 1-5'),
  category: z.string().describe('One of: flood, fire, structural, medical, hazmat, infrastructure, other'),
  title: z.string().describe('Short signal title for the dashboard card (max 60 chars)'),
  summary: z.string().describe('Brief summary of the signal (max 200 chars)'),
  credibility: z.number().describe('Credibility score 0-100'),
  extractedLocation: z.string().nullable().describe('Any location mentioned, or null'),
  recommendedAction: z.string().describe('One of: dispatch, triage, monitor, ignore'),
  icon: z.string().describe('Material Symbols icon name matching the event type'),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = IngestRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    const { object: analysis } = await generateObject({
      model: getFlashModel(),
      schema: SignalAnalysisSchema,
      prompt: `Analyze this ${parsed.data.type} signal for emergency relevance and severity.

Source: ${parsed.data.source ?? 'Unknown'}
Signal Text: ${parsed.data.text}
${parsed.data.mediaUrl ? `Media: ${parsed.data.mediaUrl}` : ''}

Classify the signal, assess credibility (0-100), extract location if mentioned, and recommend an action.
Choose an appropriate Material Symbols icon name (e.g. "apartment" for structural, "water" for flood, "local_fire_department" for fire, "videocam" for camera, "person_search" for social, "emergency" for medical).`,
    });

    // Determine tag and color based on analysis
    const tagPrefix = analysis.severity >= 4 ? 'CRITICAL' : analysis.severity >= 3 ? 'ALERT' : 'MONITOR';
    const sourceLabel = parsed.data.type.toUpperCase();
    const tagColor = analysis.severity >= 4 ? 'text-error'
      : analysis.severity >= 3 ? 'text-tertiary'
      : 'text-on-surface-variant';

    // Push to dashboard
    const card = addSignal({
      tag: `${tagPrefix} // ${sourceLabel}`,
      tagColor,
      title: analysis.title,
      desc: analysis.summary,
      source: parsed.data.source ?? parsed.data.type,
      credibility: analysis.credibility,
      credibilityColor: analysis.credibility >= 80 ? 'bg-tertiary' : analysis.credibility >= 50 ? 'bg-warning' : 'bg-error',
      time: 'just now',
      icon: analysis.icon,
    });

    addActivity(
      'Signal Processor',
      `Ingested ${parsed.data.type} signal: "${analysis.title}" — severity ${analysis.severity}, action: ${analysis.recommendedAction}`,
    );

    // Update stats
    if (analysis.isEmergency) {
      updateStats({
        activeIncidents: stats.activeIncidents + 1,
        signalHealthPct: Math.max(0, Math.min(100, stats.signalHealthPct > 0 ? stats.signalHealthPct : 98)),
      });
    }

    // Persist to Supabase — create an incident for actionable signals
    let incidentId: string | undefined;
    if (analysis.isEmergency || analysis.severity >= 3) {
      try {
        const incidentType = ['flood', 'fire', 'structural', 'medical', 'hazmat', 'infrastructure'].includes(analysis.category)
          ? analysis.category as 'flood' | 'fire' | 'structural' | 'medical' | 'hazmat' | 'infrastructure'
          : 'other' as const;

        const incident = await dbInsertIncident({
          title: analysis.title,
          description: analysis.summary,
          type: incidentType,
          severity: Math.round(Math.min(5, Math.max(1, analysis.severity))),
          status: 'new',
          location: analysis.extractedLocation
            ? { description: analysis.extractedLocation }
            : {},
          sources: [parsed.data.type === 'social' ? 'social' : parsed.data.type === 'camera' ? 'camera' : 'field'],
          mediaUrls: parsed.data.mediaUrl ? [parsed.data.mediaUrl] : [],
          corroboratedBySignals: [],
          linkedCameraAlerts: [],
        });
        incidentId = incident.id;

        addActivity(
          'Signal Processor',
          `Created incident ${incident.id} from ${parsed.data.type} signal`,
        );
      } catch (dbErr) {
        console.error('[signals/ingest] DB persist failed (non-fatal):', dbErr);
      }
    }

    // Broadcast to subscribed Telegram chats for severity 3+ signals
    if (analysis.severity >= 3) {
      broadcastAlert({
        title: analysis.title,
        severity: analysis.severity,
        summary: analysis.summary,
        location: analysis.extractedLocation,
        source: parsed.data.source ?? parsed.data.type,
      }).catch((err) => console.error('[signals/ingest] telegram broadcast error', err));
    }

    return Response.json({
      success: true,
      data: {
        signalId: card.id,
        incidentId,
        analysis,
      },
    });
  } catch (error) {
    console.error('[signals/ingest] analysis error', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Signal analysis failed',
        },
      },
      { status: 500 },
    );
  }
}
