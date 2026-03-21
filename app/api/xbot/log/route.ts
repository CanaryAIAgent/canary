/**
 * Canary — X Bot Log Route
 *
 * Returns recent polling activity logs for debugging and monitoring.
 *
 * Route: GET /api/xbot/log
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET handler — return recent mentions from Supabase
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const confidence = searchParams.get('confidence'); // Filter by confidence level

    let query = supabase
      .from('xbot_mentions')
      .select('*', { count: 'exact' })
      .order('processed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (confidence && (confidence === 'confirmed' || confidence === 'potential')) {
      query = query.eq('confidence', confidence);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[xbot-log] Database error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        hint: 'Make sure to run the migration: supabase/migrations/001_create_xbot_mentions.sql'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mentions: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[xbot-log] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

