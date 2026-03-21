/**
 * Canary — Resource Requests API
 *
 * GET  /api/resources  — List resource requests (optional filters: status, priority, incidentId, limit)
 * POST /api/resources  — Create a new resource request
 */

import { NextRequest } from 'next/server';
import { dbListResourceRequests, dbInsertResourceRequest } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const status = url.searchParams.get('status') ?? undefined;
    const priority = url.searchParams.get('priority') ?? undefined;
    const incidentId = url.searchParams.get('incidentId') ?? undefined;
    const limit = url.searchParams.get('limit')
      ? Number(url.searchParams.get('limit'))
      : undefined;

    const requests = await dbListResourceRequests({
      status,
      priority,
      incidentId,
      limit,
    });

    return Response.json({ success: true, data: requests });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { success: false, error: { code: 'LIST_FAILED', message } },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { incidentId, resourceType, quantity, priority, description, requestedBy } = body;

    if (!resourceType || !priority) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'resourceType and priority are required',
          },
        },
        { status: 400 },
      );
    }

    if (!['immediate', 'urgent', 'standard'].includes(priority)) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: "priority must be one of: immediate, urgent, standard",
          },
        },
        { status: 400 },
      );
    }

    const created = await dbInsertResourceRequest({
      incidentId,
      resourceType,
      quantity,
      priority,
      description,
      requestedBy,
    });

    return Response.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { success: false, error: { code: 'CREATE_FAILED', message } },
      { status: 500 },
    );
  }
}
