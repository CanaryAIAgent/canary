/**
 * Manual test script for X bot mention correlation
 *
 * Usage:
 *   node --loader tsx scripts/test-correlation.ts
 *   OR
 *   Add to package.json scripts: "test:correlation": "tsx scripts/test-correlation.ts"
 *   Then run: npm run test:correlation
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { correlateXMentionToIncident } from '../lib/agents/xbot-correlation';
import { dbListIncidents, dbInsertIncident } from '../lib/db';
import type { XMention } from '../lib/schemas';

async function testCorrelation() {
  console.log('='.repeat(60));
  console.log('Testing X Bot Mention Correlation');
  console.log('='.repeat(60));

  // Create a test mention
  const testMention: XMention = {
    id: 'test-tweet-123',
    authorId: 'test-author',
    authorHandle: 'testuser',
    text: 'Major flooding on Main Street! Water is knee-deep and rising fast.',
    mediaKeys: ['media-1'],
    mediaUrls: ['https://example.com/flood-photo.jpg'],
    createdAt: new Date().toISOString(),
    geo: {
      coordinates: {
        lat: 37.7749,
        lng: -122.4194,
      },
    },
  };

  console.log('\n📝 Test Mention:');
  console.log(`  ID: ${testMention.id}`);
  console.log(`  Author: @${testMention.authorHandle}`);
  console.log(`  Text: ${testMention.text}`);
  console.log(`  Location: ${testMention.geo?.coordinates?.lat}, ${testMention.geo?.coordinates?.lng}`);
  console.log(`  Media: ${testMention.mediaUrls.length} attachment(s)`);

  // Check existing incidents
  console.log('\n🔍 Checking for existing incidents...');
  const incidents = await dbListIncidents({
    status: ['new', 'triaging', 'responding'],
    limit: 10,
  });

  console.log(`  Found ${incidents.length} active incident(s)`);

  if (incidents.length > 0) {
    console.log('\n📋 Active Incidents:');
    incidents.forEach((inc, i) => {
      console.log(`  ${i + 1}. ${inc.title} (${inc.type}, severity ${inc.severity})`);
      console.log(`     Location: ${inc.location.address || 'No address'}`);
      console.log(`     Created: ${new Date(inc.createdAt).toLocaleString()}`);
    });
  }

  // Option 1: Test with existing incidents
  console.log('\n🤖 Running correlation algorithm...');
  const startTime = Date.now();

  const result = await correlateXMentionToIncident(testMention, 'confirmed');

  const duration = Date.now() - startTime;

  console.log('\n✅ Correlation Result:');
  console.log(`  Should create incident: ${result.shouldCreateIncident}`);
  console.log(`  Matched incident ID: ${result.matchedIncidentId || 'none'}`);
  console.log(`  Similarity score: ${result.similarityScore?.toFixed(3) || 'N/A'}`);
  console.log(`  Reasoning: ${result.matchReason || 'N/A'}`);
  console.log(`  Processing time: ${duration}ms`);

  // Option 2: Create a test incident if none exist
  if (incidents.length === 0) {
    console.log('\n💡 No incidents found. Creating a test incident...');

    const testIncident = await dbInsertIncident({
      title: 'Flooding on Main Street',
      description: 'Severe flooding reported in downtown area near Main Street and 5th Avenue',
      type: 'flood',
      severity: 4,
      status: 'responding',
      location: {
        lat: 37.7750, // Very close to test mention
        lng: -122.4195,
        address: 'Main Street & 5th Ave, San Francisco, CA',
      },
      sources: ['social'],
      mediaUrls: [],
      corroboratedBySignals: [],
      linkedCameraAlerts: [],
    });

    console.log(`  ✅ Created test incident: ${testIncident.id}`);
    console.log('\n🔄 Re-running correlation with new incident...');

    const result2 = await correlateXMentionToIncident(testMention, 'confirmed');

    console.log('\n✅ Correlation Result (with test incident):');
    console.log(`  Should create incident: ${result2.shouldCreateIncident}`);
    console.log(`  Matched incident ID: ${result2.matchedIncidentId}`);
    console.log(`  Similarity score: ${result2.similarityScore?.toFixed(3)}`);
    console.log(`  Reasoning: ${result2.matchReason}`);
  }

  // Test with potential mention (should early exit)
  console.log('\n🧪 Testing potential mention (no media/location)...');
  const potentialMention: XMention = {
    ...testMention,
    mediaUrls: [],
    geo: undefined,
  };

  const potentialResult = await correlateXMentionToIncident(potentialMention, 'potential');
  console.log(`  Result: ${JSON.stringify(potentialResult)}`);
  console.log(`  ✅ Correctly returned shouldCreateIncident: false (potential mentions wait for confirmation)`);

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete!');
  console.log('='.repeat(60));
}

testCorrelation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
