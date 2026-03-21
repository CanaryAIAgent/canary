/**
 * Backfill correlation for existing X mentions
 * Usage: npx tsx scripts/backfill-correlation.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { supabase, dbGetIncident, dbUpdateIncident } from '../lib/db';
import { correlateXMentionToIncident } from '../lib/agents/xbot-correlation';
import { XMentionSchema } from '../lib/schemas';

async function backfillCorrelation() {
  console.log('🔄 Starting correlation backfill...\n');

  // Get all confirmed mentions without incident_id
  const { data: mentions, error } = await supabase
    .from('xbot_mentions')
    .select('*')
    .eq('confidence', 'confirmed')
    .is('incident_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching mentions:', error);
    return;
  }

  if (!mentions || mentions.length === 0) {
    console.log('✅ No uncorrelated confirmed mentions found');
    return;
  }

  console.log(`Found ${mentions.length} confirmed mention(s) to correlate:\n`);

  for (const mention of mentions) {
    console.log(`\n📝 Processing: ${mention.tweet_id}`);
    console.log(`   Author: ${mention.author_handle}`);
    console.log(`   Text: ${mention.tweet_text.substring(0, 60)}...`);

    try {
      // Convert database row to XMention format
      const xMention = XMentionSchema.parse({
        id: mention.tweet_id,
        authorId: mention.author_id,
        authorHandle: mention.author_handle,
        text: mention.tweet_text,
        mediaKeys: [],
        mediaUrls: mention.media_urls || [],
        createdAt: mention.created_at,
        geo: mention.has_location
          ? {
              coordinates: {
                lat: 0, // Would need to parse from mention if stored
                lng: 0,
              },
            }
          : undefined,
      });

      // Run correlation
      const result = await correlateXMentionToIncident(xMention, 'confirmed');

      if (result.matchedIncidentId) {
        console.log(`   ✅ Matched to incident: ${result.matchedIncidentId}`);
        console.log(`   📊 Score: ${result.similarityScore?.toFixed(3)}`);
        console.log(`   💭 Reason: ${result.matchReason}`);

        // Update mention with incident_id
        const { error: updateMentionError } = await supabase
          .from('xbot_mentions')
          .update({ incident_id: result.matchedIncidentId })
          .eq('tweet_id', mention.tweet_id);

        if (updateMentionError) {
          console.error('   ❌ Failed to update mention:', updateMentionError);
          continue;
        }

        // Update incident's corroborated_by_signals
        const incident = await dbGetIncident(result.matchedIncidentId);
        if (incident) {
          await dbUpdateIncident(result.matchedIncidentId, {
            corroboratedBySignals: [...incident.corroboratedBySignals, mention.tweet_id],
          });
          console.log(`   ✅ Updated incident corroboration list`);
        }
      } else if (result.shouldCreateIncident) {
        console.log(`   ℹ️  Should create new incident (no matches found)`);
      } else {
        console.log(`   ⏸️  Skipped (potential mention)`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing mention:`, error);
    }
  }

  console.log('\n✅ Backfill complete!\n');

  // Show summary
  const { data: correlatedCount } = await supabase
    .from('xbot_mentions')
    .select('tweet_id', { count: 'exact', head: true })
    .not('incident_id', 'is', null);

  console.log(`📊 Summary:`);
  console.log(`   Total correlated mentions: ${correlatedCount?.length || 0}`);
}

backfillCorrelation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
