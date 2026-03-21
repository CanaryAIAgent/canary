/**
 * Canary — Incident Search
 *
 * GET /api/incidents/search?q=...&type=...&status=...&severity=...
 *
 * Full-text search across incidents with optional filters.
 */

import { supabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const type = searchParams.get('type') ?? '';
    const status = searchParams.get('status') ?? '';
    const severity = searchParams.get('severity') ?? '';
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);

    let query = supabase
      .from('incidents')
      .select('id, title, description, type, severity, status, location_address, location_description, location_zip_code, sources, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Text search — filter on title or description using ilike
    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location_address.ilike.%${q}%,location_description.ilike.%${q}%`);
    }

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (severity) query = query.gte('severity', Number(severity));

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const data = (rows ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      type: row.type,
      severity: row.severity,
      status: row.status,
      location: row.location_description ?? row.location_address ?? null,
      sources: row.sources ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return Response.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('[GET /api/incidents/search] error:', error);
    return Response.json(
      { success: false, error: { code: 'SEARCH_ERROR', message: error instanceof Error ? error.message : 'Search failed' } },
      { status: 500 },
    );
  }
}
