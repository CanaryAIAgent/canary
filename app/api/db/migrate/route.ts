/**
 * Database Migration Route
 *
 * Run migrations on Supabase
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Create xbot_mentions table
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS xbot_mentions (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tweet_id        TEXT NOT NULL UNIQUE,
          author_id       TEXT NOT NULL,
          author_handle   TEXT NOT NULL,
          tweet_text      TEXT NOT NULL,
          media_urls      TEXT[] DEFAULT '{}',
          has_media       BOOLEAN DEFAULT FALSE,
          has_location    BOOLEAN DEFAULT FALSE,
          confidence      TEXT CHECK (confidence IN ('confirmed', 'potential')),
          ai_response     TEXT,
          incident_id     UUID,
          processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_xbot_mentions_processed_at ON xbot_mentions(processed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_xbot_mentions_confidence ON xbot_mentions(confidence);
        CREATE INDEX IF NOT EXISTS idx_xbot_mentions_tweet_id ON xbot_mentions(tweet_id);
      `
    });

    if (error) {
      // Fallback: try direct table creation
      const { error: createError } = await supabase
        .from('xbot_mentions')
        .select('id')
        .limit(0);

      if (createError && createError.message.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Unable to create table. Please run the SQL migration manually in Supabase SQL Editor.',
          sql: '/supabase/migrations/001_create_xbot_mentions.sql'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully'
    });
  } catch (error) {
    console.error('[db/migrate] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Run the SQL file in Supabase SQL Editor: supabase/migrations/001_create_xbot_mentions.sql'
    }, { status: 500 });
  }
}
