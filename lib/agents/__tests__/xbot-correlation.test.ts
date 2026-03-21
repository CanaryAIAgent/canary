/**
 * Tests for X Bot Mention to Incident Correlation
 *
 * Run with: npm test (after adding jest/vitest to package.json)
 *
 * Test Coverage:
 * - No incidents exist → shouldCreateIncident: true
 * - High similarity match → returns correct incident ID
 * - Low similarity (below threshold) → shouldCreateIncident: true
 * - Location proximity bonus applied correctly
 * - Time window filtering (ignores old incidents)
 * - Potential mentions → early return without DB queries
 * - Multiple matches → selects highest score
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { correlateXMentionToIncident } from '../xbot-correlation';
import type { XMention, Incident } from '@/lib/schemas';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  dbListIncidents: vi.fn(),
  dbGetIncident: vi.fn(),
  dbUpdateIncident: vi.fn(),
}));

vi.mock('@/lib/ai/config', () => ({
  getFlashModel: vi.fn(() => 'mock-flash-model'),
}));

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@/lib/utils/geo', () => ({
  haversineDistance: vi.fn(),
}));

import { dbListIncidents } from '@/lib/db';
import { generateObject } from 'ai';
import { haversineDistance } from '@/lib/utils/geo';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockXMention: XMention = {
  id: 'tweet-123',
  authorId: 'author-456',
  authorHandle: 'testuser',
  text: 'Major flooding on Main Street! Water level rising fast.',
  mediaKeys: ['media-1'],
  mediaUrls: ['https://example.com/photo.jpg'],
  createdAt: new Date().toISOString(),
  geo: {
    coordinates: {
      lat: 37.7749,
      lng: -122.4194,
    },
  },
};

const mockIncident: Incident = {
  id: 'incident-789',
  title: 'Flooding on Main Street',
  description: 'Reports of severe flooding in downtown area',
  type: 'flood',
  severity: 4,
  status: 'responding',
  location: {
    lat: 37.7749,
    lng: -122.4194,
    address: 'Main Street, San Francisco',
  },
  sources: ['social'],
  mediaUrls: [],
  corroboratedBySignals: [],
  linkedCameraAlerts: [],
  createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
  updatedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('correlateXMentionToIncident', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return shouldCreateIncident: false for potential mentions without querying DB', async () => {
    const potentialMention: XMention = {
      ...mockXMention,
      mediaUrls: [],
      geo: undefined,
    };

    const result = await correlateXMentionToIncident(potentialMention, 'potential');

    expect(result).toEqual({ shouldCreateIncident: false });
    expect(dbListIncidents).not.toHaveBeenCalled();
  });

  it('should return shouldCreateIncident: true when no incidents exist', async () => {
    vi.mocked(dbListIncidents).mockResolvedValue([]);

    const result = await correlateXMentionToIncident(mockXMention, 'confirmed');

    expect(result.shouldCreateIncident).toBe(true);
    expect(result.matchedIncidentId).toBeUndefined();
    expect(dbListIncidents).toHaveBeenCalledWith({
      status: ['new', 'triaging', 'responding'],
      since: expect.any(String),
      limit: 50,
    });
  });

  it('should return shouldCreateIncident: true when all similarity scores are below threshold', async () => {
    vi.mocked(dbListIncidents).mockResolvedValue([mockIncident]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        similarityScore: 0.3, // Below 0.65 threshold
        reasoning: 'Different event',
      },
    } as any);
    vi.mocked(haversineDistance).mockReturnValue(10); // 10km away

    const result = await correlateXMentionToIncident(mockXMention, 'confirmed');

    expect(result.shouldCreateIncident).toBe(true);
    expect(result.matchedIncidentId).toBeUndefined();
  });

  it('should match to incident with high similarity score', async () => {
    vi.mocked(dbListIncidents).mockResolvedValue([mockIncident]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        similarityScore: 0.85, // High similarity
        reasoning: 'Same location and event type',
      },
    } as any);
    vi.mocked(haversineDistance).mockReturnValue(0.5); // 0.5km - within near bonus range

    const result = await correlateXMentionToIncident(mockXMention, 'confirmed');

    expect(result.shouldCreateIncident).toBe(false);
    expect(result.matchedIncidentId).toBe('incident-789');
    expect(result.similarityScore).toBeGreaterThan(0.85); // Should include location bonus
    expect(result.matchReason).toBe('Same location and event type');
  });

  it('should apply location proximity bonus for nearby incidents (<1km)', async () => {
    vi.mocked(dbListIncidents).mockResolvedValue([mockIncident]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        similarityScore: 0.5, // Below threshold
        reasoning: 'Similar area',
      },
    } as any);
    vi.mocked(haversineDistance).mockReturnValue(0.8); // 0.8km - within 1km

    const result = await correlateXMentionToIncident(mockXMention, 'confirmed');

    // 0.5 base + 0.2 bonus = 0.7 (above 0.65 threshold)
    expect(result.shouldCreateIncident).toBe(false);
    expect(result.matchedIncidentId).toBe('incident-789');
    expect(result.similarityScore).toBeGreaterThanOrEqual(0.65);
  });

  it('should apply smaller location bonus for close incidents (1-5km)', async () => {
    vi.mocked(dbListIncidents).mockResolvedValue([mockIncident]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        similarityScore: 0.6, // Below threshold
        reasoning: 'Nearby area',
      },
    } as any);
    vi.mocked(haversineDistance).mockReturnValue(3); // 3km - within 5km

    const result = await correlateXMentionToIncident(mockXMention, 'confirmed');

    // 0.6 base + 0.1 bonus = 0.7 (above 0.65 threshold)
    expect(result.shouldCreateIncident).toBe(false);
    expect(result.matchedIncidentId).toBe('incident-789');
    expect(result.similarityScore).toBeGreaterThanOrEqual(0.65);
  });

  it('should select highest scoring incident when multiple matches exist', async () => {
    const incident1: Incident = { ...mockIncident, id: 'incident-1' };
    const incident2: Incident = { ...mockIncident, id: 'incident-2' };
    const incident3: Incident = { ...mockIncident, id: 'incident-3' };

    vi.mocked(dbListIncidents).mockResolvedValue([incident1, incident2, incident3]);

    // Mock different similarity scores for each incident
    let callCount = 0;
    vi.mocked(generateObject).mockImplementation(async () => {
      callCount++;
      const scores = [0.7, 0.9, 0.75]; // incident-2 has highest score
      return {
        object: {
          similarityScore: scores[callCount - 1],
          reasoning: `Score ${scores[callCount - 1]}`,
        },
      } as any;
    });
    vi.mocked(haversineDistance).mockReturnValue(10); // No location bonus

    const result = await correlateXMentionToIncident(mockXMention, 'confirmed');

    expect(result.shouldCreateIncident).toBe(false);
    expect(result.matchedIncidentId).toBe('incident-2'); // Highest score
    expect(result.similarityScore).toBe(0.9);
  });

  it('should filter incidents by 24-hour time window', async () => {
    vi.mocked(dbListIncidents).mockResolvedValue([mockIncident]);

    await correlateXMentionToIncident(mockXMention, 'confirmed');

    const sinceArg = vi.mocked(dbListIncidents).mock.calls[0][0]?.since;
    expect(sinceArg).toBeDefined();

    // Verify the since timestamp is approximately 24 hours ago
    const sinceTime = new Date(sinceArg!).getTime();
    const expectedTime = Date.now() - 24 * 60 * 60 * 1000;
    expect(Math.abs(sinceTime - expectedTime)).toBeLessThan(5000); // Within 5 seconds
  });

  it('should only query active incident statuses', async () => {
    vi.mocked(dbListIncidents).mockResolvedValue([]);

    await correlateXMentionToIncident(mockXMention, 'confirmed');

    expect(dbListIncidents).toHaveBeenCalledWith({
      status: ['new', 'triaging', 'responding'],
      since: expect.any(String),
      limit: 50,
    });
  });

  it('should handle mentions without location gracefully', async () => {
    const noLocationMention: XMention = {
      ...mockXMention,
      geo: undefined,
    };

    vi.mocked(dbListIncidents).mockResolvedValue([mockIncident]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        similarityScore: 0.7,
        reasoning: 'Text similarity',
      },
    } as any);

    const result = await correlateXMentionToIncident(noLocationMention, 'confirmed');

    expect(result.shouldCreateIncident).toBe(false);
    expect(result.matchedIncidentId).toBe('incident-789');
    expect(haversineDistance).not.toHaveBeenCalled(); // No location comparison
  });

  it('should handle incidents without location gracefully', async () => {
    const noLocationIncident: Incident = {
      ...mockIncident,
      location: {
        address: 'Main Street',
      },
    };

    vi.mocked(dbListIncidents).mockResolvedValue([noLocationIncident]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        similarityScore: 0.7,
        reasoning: 'Text similarity',
      },
    } as any);

    const result = await correlateXMentionToIncident(mockXMention, 'confirmed');

    expect(result.shouldCreateIncident).toBe(false);
    expect(result.matchedIncidentId).toBe('incident-789');
    expect(haversineDistance).not.toHaveBeenCalled(); // No location comparison
  });

  it('should cap final score at 1.0 even with location bonuses', async () => {
    vi.mocked(dbListIncidents).mockResolvedValue([mockIncident]);
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        similarityScore: 0.95, // High base score
        reasoning: 'Nearly identical',
      },
    } as any);
    vi.mocked(haversineDistance).mockReturnValue(0.5); // +0.2 bonus would push over 1.0

    const result = await correlateXMentionToIncident(mockXMention, 'confirmed');

    expect(result.similarityScore).toBeLessThanOrEqual(1.0);
    expect(result.shouldCreateIncident).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration Test Notes
// ---------------------------------------------------------------------------

/**
 * Additional integration tests to add once database is available:
 *
 * 1. End-to-end correlation flow:
 *    - Create test incident in DB
 *    - Send matching mention
 *    - Verify mention.incident_id updated
 *    - Verify incident.corroboratedBySignals updated
 *
 * 2. Concurrent correlation handling:
 *    - Multiple mentions arriving simultaneously
 *    - Verify all get correlated correctly without race conditions
 *
 * 3. Real AI model responses:
 *    - Use actual Gemini API (in test mode)
 *    - Verify similarity scores are reasonable
 *    - Test with various disaster types
 *
 * 4. Performance tests:
 *    - Correlation with 50+ incidents
 *    - Verify processing time < 2 seconds
 *    - Monitor AI API costs
 */
