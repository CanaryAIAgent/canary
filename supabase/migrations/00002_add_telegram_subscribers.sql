-- ============================================================================
-- Canary — Add Telegram support to subscribers
--
-- Migration: 00002_add_telegram_subscribers
-- ============================================================================

-- Add 'telegram' to the subscriber_channel enum
ALTER TYPE subscriber_channel ADD VALUE IF NOT EXISTS 'telegram';

-- Add telegram_chat_id column to subscribers
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Unique index so one Telegram user = one subscriber row
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_telegram_chat_id
  ON subscribers (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- Relax zip_codes constraint: Telegram subscribers can opt into ALL alerts
-- (empty array = all alerts, no geographic filter)
ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS subscribers_zip_codes_check;
ALTER TABLE subscribers ALTER COLUMN zip_codes SET DEFAULT '{}';
