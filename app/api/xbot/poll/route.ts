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

  if (action === 'check') {
    return checkForMentions();
  }

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
    error: 'Invalid action. Use ?action=check, ?action=start, ?action=stop, or ?action=status',
  });
}

// ---------------------------------------------------------------------------
// Check for mentions (stateless, for cron jobs)
// ---------------------------------------------------------------------------

async function checkForMentions() {
  try {
    console.log('[xbot-poll] Starting cron check for mentions...');

    // 1. Get polling state from Supabase
    const { data: pollingState, error: stateError } = await supabase
      .from('xbot_polling_state')
      .select('since_id, last_poll_at, enabled')
      .eq('id', 'singleton')
      .single();

    if (stateError) {
      console.error('[xbot-poll] Error fetching polling state:', stateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch polling state',
      });
    }

    // Check if bot is enabled
    if (!pollingState?.enabled) {
      console.log('[xbot-poll] Bot is disabled, skipping poll');
      return NextResponse.json({
        success: true,
        message: 'Bot is disabled',
        mentionsProcessed: 0,
      });
    }

    const currentSinceId = pollingState?.since_id;
    console.log('[xbot-poll] Current sinceId:', currentSinceId || 'none');

    // 2. Authenticate and fetch mentions
    const client = createXClient();
    const userId = await getAuthenticatedUserId(client);
    console.log('[xbot-poll] Authenticated as user ID:', userId);

    const response = await fetchMentions(client, userId, currentSinceId);

    if (response.data.length === 0) {
      console.log('[xbot-poll] No new mentions found');

      // Update last_poll_at even when there are no mentions
      await supabase
        .from('xbot_polling_state')
        .update({ last_poll_at: new Date().toISOString() })
        .eq('id', 'singleton');

      return NextResponse.json({
        success: true,
        message: 'No new mentions',
        mentionsProcessed: 0,
      });
    }

    console.log(`[xbot-poll] Found ${response.data.length} new mention(s)`);

    // 3. Process each mention
    const processedIds: string[] = [];
    for (const rawMention of response.data) {
      const processed = await processMention(rawMention, response.includes, client, userId);
      if (processed) {
        processedIds.push(rawMention.id);
      }
    }

    // 4. Update polling state with newest mention ID
    const newSinceId = response.meta.newest_id || currentSinceId;
    if (newSinceId) {
      const { error: updateError } = await supabase
        .from('xbot_polling_state')
        .update({
          since_id: newSinceId,
          last_poll_at: new Date().toISOString(),
        })
        .eq('id', 'singleton');

      if (updateError) {
        console.error('[xbot-poll] Error updating polling state:', updateError);
      } else {
        console.log('[xbot-poll] Updated sinceId to:', newSinceId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mentions checked and processed',
      mentionsProcessed: processedIds.length,
      sinceId: newSinceId,
    });
  } catch (error) {
    console.error('[xbot-poll] Error during cron check:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
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
      await processMention(rawMention, response.includes, client, authenticatedUserId);
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
  client: ReturnType<typeof createXClient>,
  botUserId?: string
): Promise<boolean> {
  const tweetId = rawMention.id;

  try {
    // 1. Check deduplication using Supabase
    const { data: existing } = await supabase
      .from('xbot_mentions')
      .select('tweet_id')
      .eq('tweet_id', tweetId)
      .single();

    if (existing) {
      console.log(`[xbot-poll] Skipping duplicate mention: ${tweetId}`);
      return false;
    }

    // Also check in-memory set for current session
    if (processedTweetIds.has(tweetId)) {
      console.log(`[xbot-poll] Skipping duplicate mention (in-memory): ${tweetId}`);
      return false;
    }

    // 2. Don't reply to bot's own tweets
    const currentBotUserId = botUserId || authenticatedUserId;
    if (currentBotUserId && rawMention.author_id === currentBotUserId) {
      console.log(`[xbot-poll] Skipping bot's own tweet: ${tweetId}`);
      processedTweetIds.add(tweetId);
      return false;
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
      incident_id: handlerResult.incidentId ?? null,
    });

    if (dbError) {
      console.error(`[xbot-poll] Database error for ${tweetId}:`, dbError);
    } else {
      console.log(`[xbot-poll] Stored mention ${tweetId} in database`);
    }

    // 9. Mark as processed
    processedTweetIds.add(tweetId);
    return true;
  } catch (error) {
    console.error(`[xbot-poll] Error processing mention ${tweetId}:`, error);
    // Do not rethrow — one failed mention should not crash the polling loop
    return false;
  }
}
