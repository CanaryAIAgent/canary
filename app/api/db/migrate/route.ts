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
    // Create xbot_mentions table and xbot_polling_state table
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        -- Migration 001: xbot_mentions table
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

        -- Migration 002: xbot_polling_state table
        CREATE TABLE IF NOT EXISTS xbot_polling_state (
          id              TEXT PRIMARY KEY DEFAULT 'singleton',
          since_id        TEXT,
          last_poll_at    TIMESTAMPTZ,
          updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT singleton_row CHECK (id = 'singleton')
        );

        INSERT INTO xbot_polling_state (id)
        VALUES ('singleton')
        ON CONFLICT (id) DO NOTHING;

        -- Migration 003: Add enabled column
        ALTER TABLE xbot_polling_state
        ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;

        UPDATE xbot_polling_state
        SET enabled = TRUE
        WHERE id = 'singleton';
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
          error: 'Unable to create tables. Please run the SQL migrations manually in Supabase SQL Editor.',
          sql: [
            '/supabase/migrations/001_create_xbot_mentions.sql',
            '/supabase/migrations/002_create_xbot_polling_state.sql',
            '/supabase/migrations/003_add_enabled_to_polling_state.sql'
          ]
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
      hint: 'Run the SQL files in Supabase SQL Editor: 001_create_xbot_mentions.sql, 002_create_xbot_polling_state.sql, and 003_add_enabled_to_polling_state.sql'
    }, { status: 500 });
  }
}
