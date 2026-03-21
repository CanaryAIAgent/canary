/**
 * Canary — Deny Resource Request
 *
 * POST /api/resources/[id]/deny
 */

import { NextRequest } from 'next/server';
import { dbUpdateResourceRequest } from '@/lib/db';

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/resources/[id]/deny'>,
) {
  const { id } = await ctx.params;

  try {
    const body = await req.json().catch(() => ({}));
    const deniedReason = body.reason ?? undefined;
    const approvedBy = body.deniedBy ?? undefined;

    const updated = await dbUpdateResourceRequest(id, {
      status: 'denied',
      deniedReason,
      approvedBy,
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
      { success: false, error: { code: 'DENY_FAILED', message } },
      { status: 500 },
    );
  }
}
