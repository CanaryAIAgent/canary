/**
 * X Bot Initialization Route
 *
 * Ensures the polling state singleton row exists
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Insert or update the singleton row
    const { error } = await supabase
      .from('xbot_polling_state')
      .upsert({
        id: 'singleton',
        enabled: true,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[xbot-init] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'X Bot polling state initialized',
    });
  } catch (error) {
    console.error('[xbot-init] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
