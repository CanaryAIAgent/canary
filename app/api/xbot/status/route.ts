/**
 * X Bot Status Route
 *
 * GET: Returns current status (enabled, last poll, mentions count)
 * POST: Toggle enabled/disabled state
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get polling state
    const { data: pollingState, error: stateError } = await supabase
      .from('xbot_polling_state')
      .select('since_id, last_poll_at, enabled')
      .eq('id', 'singleton')
      .single();

    if (stateError) {
      console.error('[xbot-status] Error fetching polling state:', stateError);
    }

    // Get total mentions count
    const { count, error: countError } = await supabase
      .from('xbot_mentions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('[xbot-status] Error fetching mentions count:', countError);
    }

    return NextResponse.json({
      enabled: pollingState?.enabled ?? true,
      lastPollAt: pollingState?.last_poll_at || null,
      sinceId: pollingState?.since_id || null,
      totalMentions: count || 0,
    });
  } catch (error) {
    console.error('[xbot-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled } = body;

    // Update the enabled flag in the database
    // The polling endpoint will check this flag before processing
    const { error } = await supabase
      .from('xbot_polling_state')
      .update({
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'singleton');

    if (error) {
      console.error('[xbot-status] Error updating state:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update status' },
        { status: 500 }
      );
    }

    console.log(`[xbot-status] X Bot ${enabled ? 'enabled' : 'disabled'}`);

    return NextResponse.json({
      success: true,
      message: `X Bot ${enabled ? 'enabled' : 'disabled'}`,
      enabled,
    });
  } catch (error) {
    console.error('[xbot-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
