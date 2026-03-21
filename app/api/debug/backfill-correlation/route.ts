/**
 * Backfill correlation for existing mentions via API
 * POST /api/debug/backfill-correlation
 */

import { NextResponse } from 'next/server';
import { supabase, dbGetIncident, dbUpdateIncident } from '@/lib/db';
import { correlateXMentionToIncident } from '@/lib/agents/xbot-correlation';
import { XMentionSchema } from '@/lib/schemas';

export async function POST() {
  console.log('[backfill] Starting correlation backfill...');

  try {
    // Get all confirmed mentions without incident_id
    const { data: mentions, error } = await supabase
      .from('xbot_mentions')
      .select('*')
      .eq('confidence', 'confirmed')
      .is('incident_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!mentions || mentions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No uncorrelated confirmed mentions found',
        processed: 0,
      });
    }

    const results = [];

    for (const mention of mentions) {
      console.log(`[backfill] Processing ${mention.tweet_id}`);

      try {
        // Convert to XMention format
        // Fix datetime format (convert +00:00 to Z)
        const createdAt = mention.created_at.replace(/\+00:00$/, 'Z');

        const xMention = XMentionSchema.parse({
          id: mention.tweet_id,
          authorId: mention.author_id,
          authorHandle: mention.author_handle,
          text: mention.tweet_text,
          mediaKeys: [],
          mediaUrls: mention.media_urls || [],
          createdAt,
        });

        // Run correlation
        const result = await correlateXMentionToIncident(xMention, 'confirmed');

        if (result.matchedIncidentId) {
          // Update mention
          await supabase
            .from('xbot_mentions')
            .update({ incident_id: result.matchedIncidentId })
            .eq('tweet_id', mention.tweet_id);

          // Update incident
          const incident = await dbGetIncident(result.matchedIncidentId);
          if (incident) {
            await dbUpdateIncident(result.matchedIncidentId, {
              corroboratedBySignals: [...incident.corroboratedBySignals, mention.tweet_id],
            });
          }

          results.push({
            tweetId: mention.tweet_id,
            matched: true,
            incidentId: result.matchedIncidentId,
            score: result.similarityScore,
            reason: result.matchReason,
          });
        } else {
          results.push({
            tweetId: mention.tweet_id,
            matched: false,
            shouldCreateIncident: result.shouldCreateIncident,
          });
        }
      } catch (err) {
        console.error(`[backfill] Error processing ${mention.tweet_id}:`, err);
        results.push({
          tweetId: mention.tweet_id,
          error: String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: mentions.length,
      results,
    });
  } catch (error) {
    console.error('[backfill] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
