/**
 * Canary — X Bot Mention to Incident Correlation Service
 *
 * Uses AI-powered semantic similarity combined with location proximity
 * and time-based filtering to intelligently link X mentions to existing
 * incidents or determine when a new incident should be created.
 *
 * Algorithm:
 * 1. Early exit for "potential" mentions (no media/location)
 * 2. Query recent incidents (24h window)
 * 3. Score each incident using Gemini Flash for semantic similarity
 * 4. Apply location proximity bonuses
 * 5. Select best match above threshold or flag for new incident creation
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getFlashModel } from '@/lib/ai/config';
import { dbListIncidents } from '@/lib/db';
import { haversineDistance } from '@/lib/utils/geo';
import type { XMention, Incident } from '@/lib/schemas';

// ---------------------------------------------------------------------------
// Configuration Constants
// ---------------------------------------------------------------------------

const SIMILARITY_THRESHOLD = 0.65; // Minimum score to link (0-1 scale)
const TIME_WINDOW_HOURS = 24; // Only match incidents from last 24h
const LOCATION_BONUS_NEAR = 0.2; // Bonus for locations within 1km
const LOCATION_BONUS_CLOSE = 0.1; // Bonus for locations within 5km

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CorrelationResult {
  shouldCreateIncident: boolean;
  matchedIncidentId?: string;
  similarityScore?: number;
  matchReason?: string;
}

interface ScoredIncident {
  incidentId: string;
  score: number;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Main Correlation Function
// ---------------------------------------------------------------------------

/**
 * Correlate an X mention to existing incidents using AI similarity + location proximity.
 *
 * @param mention - Validated X mention payload
 * @param confidence - 'confirmed' (has media/location) or 'potential' (text only)
 * @returns Correlation result with matched incident ID or flag to create new
 */
export async function correlateXMentionToIncident(
  mention: XMention,
  confidence: 'confirmed' | 'potential'
): Promise<CorrelationResult> {
  const startTime = Date.now();

  // 1. Early exit for potential mentions - don't correlate until confirmed
  if (confidence === 'potential') {
    console.log('[xbot-correlation] Skipping potential mention (no media/location)');
    return { shouldCreateIncident: false };
  }

  // 2. Query recent incidents within time window
  const since = new Date(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const incidents = await dbListIncidents({
    status: ['new', 'triaging', 'responding'], // Only active incidents
    since,
    limit: 50, // Reasonable limit for AI comparison
  });

  console.log('[xbot-correlation]', {
    mentionId: mention.id,
    candidateIncidents: incidents.length,
    timeWindowHours: TIME_WINDOW_HOURS,
  });

  // 3. No incidents exist → create new
  if (incidents.length === 0) {
    console.log('[xbot-correlation] No active incidents found → create new');
    return { shouldCreateIncident: true };
  }

  // 4. Score each incident using AI + location proximity
  const scoredIncidents = await Promise.all(
    incidents.map((incident) => scoreIncidentSimilarity(mention, incident))
  );

  // 5. Select best match above threshold
  const matches = scoredIncidents.filter((s) => s.score >= SIMILARITY_THRESHOLD);

  if (matches.length === 0) {
    console.log('[xbot-correlation] No matches above threshold → create new');
    return { shouldCreateIncident: true };
  }

  // Sort by score descending and take highest
  const bestMatch = matches.sort((a, b) => b.score - a.score)[0];

  const processingTime = Date.now() - startTime;

  console.log('[xbot-correlation]', {
    mentionId: mention.id,
    matchedIncidentId: bestMatch.incidentId,
    similarityScore: bestMatch.score.toFixed(3),
    reasoning: bestMatch.reasoning,
    processingTimeMs: processingTime,
  });

  return {
    shouldCreateIncident: false,
    matchedIncidentId: bestMatch.incidentId,
    similarityScore: bestMatch.score,
    matchReason: bestMatch.reasoning,
  };
}

// ---------------------------------------------------------------------------
// Similarity Scoring
// ---------------------------------------------------------------------------

/**
 * Score similarity between a mention and an incident using AI + location.
 *
 * @param mention - X mention to score
 * @param incident - Incident to compare against
 * @returns Scored incident with similarity score (0-1) and reasoning
 */
async function scoreIncidentSimilarity(
  mention: XMention,
  incident: Incident
): Promise<ScoredIncident> {
  // Build location strings for prompt
  const mentionLocation = mention.geo?.coordinates
    ? `${mention.geo.coordinates.lat}, ${mention.geo.coordinates.lng}`
    : 'unknown';

  const incidentLocation =
    incident.location.address ||
    (incident.location.lat && incident.location.lng
      ? `${incident.location.lat}, ${incident.location.lng}`
      : 'unknown');

  // AI similarity scoring
  const prompt = `Compare this X mention to the incident and determine if they describe the same event.

X Mention:
- Text: "${mention.text}"
- Author: @${mention.authorHandle}
- Time: ${mention.createdAt}
- Location: ${mentionLocation}
- Media: ${mention.mediaUrls.length > 0 ? 'yes' : 'no'}

Incident:
- Title: "${incident.title}"
- Description: "${incident.description || 'none'}"
- Type: ${incident.type}
- Severity: ${incident.severity}
- Location: ${incidentLocation}
- Created: ${incident.createdAt}

Analyze semantic similarity, geographic proximity, and temporal correlation.
Score from 0.0 (completely unrelated) to 1.0 (definitely the same event).
Provide brief reasoning for your score.`;

  const { object } = await generateObject({
    model: getFlashModel(),
    schema: z.object({
      similarityScore: z
        .number()
        .min(0)
        .max(1)
        .describe('Similarity score from 0.0 to 1.0'),
      reasoning: z.string().describe('Brief explanation of the score'),
    }),
    prompt,
  });

  let finalScore = object.similarityScore;

  // Apply location proximity bonus if both have coordinates
  if (mention.geo?.coordinates && incident.location.lat && incident.location.lng) {
    const distance = haversineDistance(
      mention.geo.coordinates.lat,
      mention.geo.coordinates.lng,
      incident.location.lat,
      incident.location.lng
    );

    if (distance < 1) {
      finalScore += LOCATION_BONUS_NEAR;
      console.log(
        `[xbot-correlation] Location bonus applied: +${LOCATION_BONUS_NEAR} (${distance.toFixed(2)}km)`
      );
    } else if (distance < 5) {
      finalScore += LOCATION_BONUS_CLOSE;
      console.log(
        `[xbot-correlation] Location bonus applied: +${LOCATION_BONUS_CLOSE} (${distance.toFixed(2)}km)`
      );
    }
  }

  // Cap at 1.0
  finalScore = Math.min(1, finalScore);

  return {
    incidentId: incident.id,
    score: finalScore,
    reasoning: object.reasoning,
  };
}
