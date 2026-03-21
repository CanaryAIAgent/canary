-- X Bot Mentions table
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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_xbot_mentions_processed_at ON xbot_mentions(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_xbot_mentions_confidence ON xbot_mentions(confidence);
CREATE INDEX IF NOT EXISTS idx_xbot_mentions_tweet_id ON xbot_mentions(tweet_id);
