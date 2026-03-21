-- Add enabled column to xbot_polling_state
ALTER TABLE xbot_polling_state
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;

-- Update existing row to be enabled
UPDATE xbot_polling_state
SET enabled = TRUE
WHERE id = 'singleton';
