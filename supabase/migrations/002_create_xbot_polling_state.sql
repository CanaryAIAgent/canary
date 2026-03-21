-- X Bot Polling State table
-- Stores the last processed tweet ID to avoid reprocessing
CREATE TABLE IF NOT EXISTS xbot_polling_state (
  id              TEXT PRIMARY KEY DEFAULT 'singleton',
  since_id        TEXT,
  last_poll_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one row exists
  CONSTRAINT singleton_row CHECK (id = 'singleton')
);

-- Insert the initial singleton row
INSERT INTO xbot_polling_state (id)
VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;
