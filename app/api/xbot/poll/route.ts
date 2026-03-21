/**
 * Canary — X Bot Polling Route
 *
 * Polls for new @mentions on @canaryaiagent every 30 seconds,
 * extracts structured data, passes to AI handler, and replies directly.
 *
 * Route: GET /api/xbot/poll
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createXClient,
  fetchMentions,
  getAuthenticatedUserId,
  postReply,
  extractMediaUrls,
  extractLocation,
  getAuthorHandle,
} from '@/lib/integrations/xapi';
import { handleXMention } from '@/lib/agents/xbot-handler';
import { XMentionSchema, type XMention } from '@/lib/schemas';
import { supabase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Module-level state for deduplication and polling
// ---------------------------------------------------------------------------

let sinceId: string | undefined;
let authenticatedUserId: string | undefined;
const processedTweetIds = new Set<string>();
let isPolling = false;
let pollInterval: NodeJS.Timeout | undefined;

// ---------------------------------------------------------------------------
// Main polling handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');

  if (action === 'start') {
    return startPolling();
  }

  if (action === 'stop') {
    return stopPolling();
  }

  if (action === 'status') {
    return NextResponse.json({
      success: true,
      isPolling,
      processedCount: processedTweetIds.size,
      sinceId: sinceId || null,
    });
  }

  return NextResponse.json({
    success: false,
    error: 'Invalid action. Use ?action=start, ?action=stop, or ?action=status',
  });
}

// ---------------------------------------------------------------------------
// Start polling
// ---------------------------------------------------------------------------

function startPolling() {
  if (isPolling) {
    return NextResponse.json({
      success: false,
      error: 'Polling is already active',
    });
  }

  isPolling = true;

  // Initialize on first poll
  (async () => {
    try {
      const client = createXClient();
      authenticatedUserId = await getAuthenticatedUserId(client);
      console.log('[xbot-poll] Authenticated as user ID:', authenticatedUserId);

      // Fetch the latest mention to set sinceId without processing it
      const initialResponse = await fetchMentions(client, authenticatedUserId);
      if (initialResponse.data.length > 0) {
        sinceId = initialResponse.data[0].id;
        console.log('[xbot-poll] Initial sinceId set to:', sinceId);
      }

      // Start polling every 30 seconds
      pollInterval = setInterval(() => pollMentions(), 30000);
      console.log('[xbot-poll] Polling started with 30s interval');

      // Immediate first poll
      pollMentions();
    } catch (error) {
      console.error('[xbot-poll] Failed to initialize polling:', error);
      isPolling = false;
    }
  })();

  return NextResponse.json({
    success: true,
    message: 'Polling started',
  });
}

// ---------------------------------------------------------------------------
// Stop polling
// ---------------------------------------------------------------------------

function stopPolling() {
  if (!isPolling) {
    return NextResponse.json({
      success: false,
      error: 'Polling is not active',
    });
  }

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = undefined;
  }

  isPolling = false;
  console.log('[xbot-poll] Polling stopped');

  return NextResponse.json({
    success: true,
    message: 'Polling stopped',
    processedCount: processedTweetIds.size,
  });
}

// ---------------------------------------------------------------------------
// Poll for new mentions
// ---------------------------------------------------------------------------

async function pollMentions() {
  if (!authenticatedUserId) {
    console.error('[xbot-poll] No authenticated user ID');
    return;
  }

  try {
    const client = createXClient();
    const response = await fetchMentions(client, authenticatedUserId, sinceId);

    if (response.data.length === 0) {
      console.log('[xbot-poll] No new mentions');
      return;
    }

    console.log(`[xbot-poll] Found ${response.data.length} new mention(s)`);

    // Update sinceId to the newest mention
    if (response.meta.newest_id) {
      sinceId = response.meta.newest_id;
    }

    // Process each mention
    for (const rawMention of response.data) {
      await processMention(rawMention, response.includes, client);
    }
  } catch (error) {
    console.error('[xbot-poll] Error during polling:', error);
  }
}

// ---------------------------------------------------------------------------
// Process a single mention
// ---------------------------------------------------------------------------

async function processMention(
  rawMention: any,
  includes: any,
  client: ReturnType<typeof createXClient>
) {
  const tweetId = rawMention.id;

  try {
    // 1. Check deduplication
    if (processedTweetIds.has(tweetId)) {
      console.log(`[xbot-poll] Skipping duplicate mention: ${tweetId}`);
      return;
    }

    // 2. Don't reply to bot's own tweets
    if (rawMention.author_id === authenticatedUserId) {
      console.log(`[xbot-poll] Skipping bot's own tweet: ${tweetId}`);
      processedTweetIds.add(tweetId);
      return;
    }

    // 3. Extract full payload per XMentionSchema
    const mediaUrls = extractMediaUrls(rawMention, includes);
    const location = extractLocation(rawMention, includes);
    const authorHandle = getAuthorHandle(rawMention, includes);

    const mention: XMention = {
      id: tweetId,
      authorId: rawMention.author_id,
      authorHandle,
      text: rawMention.text,
      mediaKeys: rawMention.attachments?.media_keys || [],
      mediaUrls,
      createdAt: rawMention.created_at,
      conversationId: rawMention.conversation_id,
      inReplyToUserId: rawMention.in_reply_to_user_id,
      lang: rawMention.lang,
      geo: location
        ? {
            placeId: location.placeId,
            coordinates: location.coordinates,
          }
        : undefined,
    };

    // Validate with schema
    const validatedMention = XMentionSchema.parse(mention);

    // 4. Determine confidence level
    const hasMedia = mediaUrls.length > 0;
    const hasLocation = !!location?.coordinates;
    const confidence = hasMedia || hasLocation ? 'confirmed' : 'potential';

    console.log(`[xbot-poll] Processing mention ${tweetId} (${confidence})`, {
      author: authorHandle,
      hasMedia,
      hasLocation,
      text: rawMention.text.slice(0, 50) + '...',
    });

    // 5. If potential, reply asking for more info (but still pass to handler)
    if (confidence === 'potential') {
      await postReply(
        client,
        tweetId,
        'Thank you for reaching out. Could you please share a photo, video, or your location to help us better assess the situation?'
      );
      console.log(`[xbot-poll] Sent request for additional info to ${tweetId}`);
    }

    // 6. Pass to AI handler
    const handlerResult = await handleXMention(validatedMention);
    console.log(`[xbot-poll] AI handler result for ${tweetId}:`, handlerResult);

    // 7. Reply with AI handler response (skip if we already replied above for potential)
    if (confidence === 'confirmed') {
      await postReply(client, tweetId, handlerResult.reply);
      console.log(`[xbot-poll] Replied to ${tweetId}: "${handlerResult.reply}"`);
    }

    // 8. Store in Supabase
    const { error: dbError } = await supabase.from('xbot_mentions').insert({
      tweet_id: tweetId,
      author_id: rawMention.author_id,
      author_handle: authorHandle,
      tweet_text: rawMention.text,
      media_urls: mediaUrls,
      has_media: hasMedia,
      has_location: hasLocation,
      confidence,
      ai_response: handlerResult.reply,
      incident_id: handlerResult.shouldCreateIncident ? null : null, // TODO: link to incident when created
    });

    if (dbError) {
      console.error(`[xbot-poll] Database error for ${tweetId}:`, dbError);
    } else {
      console.log(`[xbot-poll] Stored mention ${tweetId} in database`);
    }

    // 9. Mark as processed
    processedTweetIds.add(tweetId);
  } catch (error) {
    console.error(`[xbot-poll] Error processing mention ${tweetId}:`, error);
    // Do not rethrow — one failed mention should not crash the polling loop
  }
}
