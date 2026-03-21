# Testing X Bot Mention Correlation

## Option 1: Test via Next.js Dev Server (Recommended)

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Trigger X bot polling:**
   ```bash
   # Check for new mentions (runs correlation)
   curl "http://localhost:3000/api/xbot/poll?action=check"
   ```

3. **Check the logs:**
   - Look for `[xbot-correlation]` messages in your terminal
   - You'll see similarity scores, matched incidents, and processing times

4. **Inspect the database:**
   ```bash
   # Check if mentions were linked to incidents
   npx supabase db execute "SELECT tweet_id, incident_id, confidence, has_media FROM xbot_mentions ORDER BY created_at DESC LIMIT 10;"

   # Check if incidents have corroborating signals
   npx supabase db execute "SELECT id, title, corroborated_by_signals FROM incidents ORDER BY created_at DESC LIMIT 10;"
   ```

## Option 2: Test with Mock Data via API Route

Create a test incident first, then send a mention:

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Create a test incident** (via your app UI or API)

3. **Send a test mention** to @canaryaiagent on X with:
   - Text mentioning the same incident
   - A photo or location
   - Example: "@canaryaiagent Major flooding on Main Street! [attach photo]"

4. **Watch the correlation happen:**
   - The bot will receive the mention
   - Correlation will run automatically
   - Check logs for `[xbot-correlation] Linked tweet-XXX to incident-YYY`

## Option 3: Manual Database Inspection

1. **Check existing incidents:**
   ```bash
   npx supabase db execute "SELECT id, title, type, severity, status, created_at FROM incidents WHERE status IN ('new', 'triaging', 'responding') ORDER BY created_at DESC;"
   ```

2. **Check mentions:**
   ```bash
   npx supabase db execute "SELECT tweet_id, author_handle, tweet_text, confidence, incident_id, created_at FROM xbot_mentions ORDER BY created_at DESC LIMIT 5;"
   ```

3. **Check correlation links:**
   ```bash
   npx supabase db execute "
   SELECT
     xm.tweet_id,
     xm.author_handle,
     xm.confidence,
     i.id as incident_id,
     i.title,
     array_length(i.corroborated_by_signals, 1) as num_corroborating_signals
   FROM xbot_mentions xm
   LEFT JOIN incidents i ON xm.incident_id = i.id
   WHERE xm.incident_id IS NOT NULL
   ORDER BY xm.created_at DESC
   LIMIT 10;
   "
   ```

## Option 4: Unit Tests (When you add a test framework)

1. **Install Vitest:**
   ```bash
   npm install -D vitest @vitest/ui
   ```

2. **Add to package.json scripts:**
   ```json
   "test": "vitest",
   "test:ui": "vitest --ui"
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

## What to Look For

### Successful Correlation Signs:

1. **In logs:**
   ```
   [xbot-correlation] {
     mentionId: 'tweet-123',
     candidateIncidents: 5,
     timeWindowHours: 24
   }
   [xbot-correlation] Location bonus applied: +0.2 (0.85km)
   [xbot-poll] Linked tweet-123 to incident abc-def (score: 0.850)
   [xbot-poll] Updated incident abc-def with corroborating signal tweet-123
   ```

2. **In database:**
   - `xbot_mentions.incident_id` should have a UUID (not null)
   - `incidents.corroborated_by_signals` should contain tweet IDs

3. **New incident creation:**
   ```
   [xbot-poll] Should create new incident for tweet-456 (no matching incidents found)
   ```

### Configuration Tuning:

If you're getting too many/few matches, adjust in `lib/agents/xbot-correlation.ts`:
- `SIMILARITY_THRESHOLD = 0.65` → Lower = more matches, Higher = fewer matches
- `TIME_WINDOW_HOURS = 24` → Adjust time window
- `LOCATION_BONUS_NEAR = 0.2` → Adjust location scoring

## Troubleshooting

**No mentions being processed:**
- Check `xbot_polling_state` table: `enabled` should be `true`
- Ensure X API credentials are in `.env.local`

**No correlation happening:**
- Ensure mentions have `confidence = 'confirmed'` (have media or location)
- Check that incidents exist with status `new`, `triaging`, or `responding`

**AI errors:**
- Check `GOOGLE_GENERATIVE_AI_API_KEY` or `AI_SDK_API_KEY` is set
- Monitor API rate limits

**Database errors:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
