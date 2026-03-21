/**
 * Canary — Publish / Unpublish Incident Public Status Page
 *
 * POST /api/incidents/[id]/publish   — generate & store public summary
 * DELETE /api/incidents/[id]/publish — remove public summary
 */

import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getFlashModel } from '@/lib/ai/config';
import { dbGetIncident, dbUpdateIncident } from '@/lib/db';

export const maxDuration = 30;

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<'/api/incidents/[id]/publish'>,
) {
  const { id } = await ctx.params;

  try {
    const incident = await dbGetIncident(id);

    if (!incident) {
      return Response.json(
        { error: 'Incident not found' },
        { status: 404 },
      );
    }

    // Generate public summary using AI
    const { object: publicSummary } = await generateObject({
      model: getFlashModel(),
      prompt: `Generate a concise, public-facing status page summary for this emergency incident.
Use plain language suitable for affected residents and media. Do NOT include sensitive operational details.

Incident:
- Title: ${incident.title}
- Type: ${incident.type}
- Severity: ${incident.severity}/5
- Status: ${incident.status}
- Description: ${incident.description ?? 'No description'}
- Location: ${incident.location?.description ?? incident.location?.address ?? 'Not specified'}
- Created: ${incident.createdAt}`,
      schema: z.object({
        headline: z.string().describe('Public-facing headline, max 100 chars'),
        summary: z.string().describe('2-3 paragraph summary for the public'),
        safetyInstructions: z.array(z.string()).describe('Bullet-point safety instructions for residents'),
        currentStatus: z.string().describe('One-line current status, e.g. "Response teams deployed"'),
        lastUpdated: z.string().describe('ISO timestamp of when this summary was generated'),
      }),
    });

    // Persist to incident ai_analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = (incident.aiAnalysis ?? {}) as any;
    await dbUpdateIncident(id, {
      aiAnalysis: {
        ...existing,
        publicSummary: {
          ...publicSummary,
          lastUpdated: new Date().toISOString(),
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    return Response.json({
      success: true,
      publicUrl: `/status/${id}`,
      summary: publicSummary,
    });
  } catch (err) {
    console.error('[api/incidents/[id]/publish] Error:', err);
    return Response.json(
      { error: 'Failed to publish incident' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/incidents/[id]/publish'>,
) {
  const { id } = await ctx.params;

  try {
    const incident = await dbGetIncident(id);

    if (!incident) {
      return Response.json(
        { error: 'Incident not found' },
        { status: 404 },
      );
    }

    // Remove publicSummary from ai_analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = (incident.aiAnalysis ?? {}) as any;
    const { publicSummary: _, ...rest } = existing;
    await dbUpdateIncident(id, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aiAnalysis: rest as any,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/incidents/[id]/publish] DELETE error:', err);
    return Response.json(
      { error: 'Failed to unpublish incident' },
      { status: 500 },
    );
  }
}
