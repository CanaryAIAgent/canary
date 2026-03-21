/**
 * Canary — Fulfill Resource Request
 *
 * POST /api/resources/[id]/fulfill
 */

import { NextRequest } from 'next/server';
import { dbUpdateResourceRequest } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<'/api/resources/[id]/fulfill'>,
) {
  const { id } = await ctx.params;

  try {
    const updated = await dbUpdateResourceRequest(id, {
      status: 'fulfilled',
      fulfilledAt: new Date().toISOString(),
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
      { success: false, error: { code: 'FULFILL_FAILED', message } },
      { status: 500 },
    );
  }
}
