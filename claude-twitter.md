# X Bot Integration

## Purpose
Authenticate with X, poll for new @ mentions on @canaryaiagent, extract all
available data from each mention, and pass a structured payload to the AI
handler at lib/agents. The bot replies directly to the original tweet.

## Location
- Client setup: lib/integrations/xapi.ts
- Polling route: app/api/xbot/poll/route.ts
- Log route: app/api/xbot/log/route.ts

## Stack Alignment
- Next.js App Router, Node.js runtime
- TypeScript, Zod validation
- Existing XMentionSchema in lib/schemas/index.ts covers the payload shape
- Follow patterns established in lib/agents/ and lib/integrations/

## Credentials
- X_API_KEY
- X_API_KEY_SECRET
- X_ACCESS_TOKEN
- X_ACCESS_TOKEN_SECRET

## Authentication
OAuth 1.0a using all four credentials above.
These are credentials for the @canaryaiagent account only.
No user-facing login. Read and write permissions required.

## Polling
- Interval: every 30 seconds via setInterval inside the route handler
- On startup: fetch the latest mention ID, store as sinceId, do NOT process it
- Each poll: fetch only mentions newer than sinceId using since_id param
- After each poll: update sinceId to the newest mention ID seen
- max_results: 10 per poll

## Payload Passed to AI Handler
Use the existing XMentionSchema from lib/schemas/index.ts.
Each mention should include:
- text: tweet text
- mediaUrls: array of image/video URLs if attached
- geo: coordinates if provided
- authorHandle: @handle of the sender
- createdAt: when it was sent
- id: tweet ID for deduplication and reply

## Media Extraction
- Request expansions: attachments.media_keys
- Request media.fields: url, type, preview_image_url
- Separate images and videos into mediaUrls array
- Pass empty array if no media

## Location Extraction
- Request tweet.fields: geo
- Request place.fields: full_name, country, geo with expansion geo.place_id
- Pass null for both if not present

## Confidence Flag
- confirmed: mention has text AND at least one of (image, video, or location)
- potential: text only, no media or location
- Include confidence field on the payload passed to the AI handler
- If potential: reply asking for photo, video, or location before passing to handler
- Still pass to the AI handler immediately regardless — do not wait

## For Each Mention
1. Check dedup Set — skip if already processed
2. Extract full payload per XMentionSchema
3. Determine confidence level
4. Pass payload to AI handler (stub — teammate building this)
5. Reply to original tweet with AI handler response
6. Mark mention as processed

## Deduplication
Track processed tweet IDs in a module-level Set.
Resets on server restart — acceptable for now.

## Error Handling
One failed mention must never crash the polling loop.
Log errors with tweet ID. Wrap loop body in try/catch.

## AI Handler
Stub only. Located in lib/agents/.
Accepts XMentionSchema payload, returns a string.
Teammate is building the implementation separately.

## Runtime Config
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
No maxDuration needed — polling is lightweight.

## Constraints
- Replies must be under 260 characters
- Do not reply to the bot's own tweets
- Do not process mentions older than bot startup