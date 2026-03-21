/**
 * Canary — Approve Resource Request
 *
 * POST /api/resources/[id]/approve
 */

import { NextRequest } from 'next/server';
import { dbUpdateResourceRequest } from '@/lib/db';

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/resources/[id]/approve'>,
) {
  const { id } = await ctx.params;

  try {
    const body = await req.json().catch(() => ({}));
    const approvedBy = body.approvedBy ?? 'System';

    const updated = await dbUpdateResourceRequest(id, {
      status: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString(),
    });

    if (!updated) {
      return Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Resource request not found' } },
        { status: 404 },
      );
    }

    return Response.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { success: false, error: { code: 'APPROVE_FAILED', message } },
      { status: 500 },
    );
  }
}
