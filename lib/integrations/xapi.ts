/**
 * Canary — X API Client
 *
 * OAuth 1.0a authentication for @canaryaiagent.
 * Provides methods for polling mentions, posting replies, and extracting media/location.
 */

import { TwitterApi } from 'twitter-api-v2';

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

export function createXClient() {
  const apiKey = process.env.X_API_KEY;
  const apiKeySecret = process.env.X_API_KEY_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiKeySecret || !accessToken || !accessTokenSecret) {
    throw new Error(
      'Missing X API credentials. Ensure X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET are set.'
    );
  }

  // OAuth 1.0a client
  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiKeySecret,
    accessToken: accessToken,
    accessSecret: accessTokenSecret,
  });
}

// ---------------------------------------------------------------------------
// Types for X API responses
// ---------------------------------------------------------------------------

export interface XMentionRaw {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  lang?: string;
  geo?: {
    place_id?: string;
    coordinates?: {
      type: string;
      coordinates: [number, number]; // [lng, lat]
    };
  };
  attachments?: {
    media_keys?: string[];
  };
}

export interface XUserRaw {
  id: string;
  username: string;
  name: string;
}

export interface XMediaRaw {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  preview_image_url?: string;
}

export interface XPlaceRaw {
  id: string;
  full_name: string;
  country?: string;
  geo?: {
    type: string;
    bbox?: number[];
    properties?: Record<string, unknown>;
  };
}

export interface XMentionsResponse {
  data: XMentionRaw[];
  includes?: {
    users?: XUserRaw[];
    media?: XMediaRaw[];
    places?: XPlaceRaw[];
  };
  meta: {
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
    next_token?: string;
  };
}

// ---------------------------------------------------------------------------
// Fetch mentions for @canaryaiagent
// ---------------------------------------------------------------------------

export async function fetchMentions(
  client: TwitterApi,
  userId: string,
  sinceId?: string
): Promise<XMentionsResponse> {
  const params: Record<string, unknown> = {
    max_results: 10,
    'tweet.fields': 'created_at,author_id,conversation_id,in_reply_to_user_id,lang,geo',
    'user.fields': 'username,name',
    expansions: 'author_id,attachments.media_keys,geo.place_id',
    'media.fields': 'url,type,preview_image_url',
    'place.fields': 'full_name,country,geo',
  };

  if (sinceId) {
    params.since_id = sinceId;
  }

  try {
    const response = await client.v2.userMentionTimeline(userId, params);

    return {
      data: (response.data.data || []) as unknown as XMentionRaw[],
      includes: response.includes as XMentionsResponse['includes'],
      meta: {
        result_count: response.data.data?.length || 0,
        newest_id: response.meta?.newest_id,
        oldest_id: response.meta?.oldest_id,
        next_token: response.meta?.next_token,
      },
    };
  } catch (error) {
    console.error('[xapi] Error fetching mentions:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Get authenticated user ID
// ---------------------------------------------------------------------------

export async function getAuthenticatedUserId(client: TwitterApi): Promise<string> {
  try {
    const user = await client.v2.me();
    return user.data.id;
  } catch (error) {
    console.error('[xapi] Error fetching authenticated user:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Post a reply tweet
// ---------------------------------------------------------------------------

export async function postReply(
  client: TwitterApi,
  tweetId: string,
  text: string
): Promise<{ id: string; text: string }> {
  // Ensure reply is under 280 characters (using 260 as buffer per requirements)
  const truncatedText = text.length > 260 ? text.slice(0, 257) + '...' : text;

  try {
    const response = await client.v2.reply(truncatedText, tweetId);
    return {
      id: response.data.id,
      text: response.data.text,
    };
  } catch (error) {
    console.error('[xapi] Error posting reply:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Extract media URLs from mention
// ---------------------------------------------------------------------------

export function extractMediaUrls(
  mention: XMentionRaw,
  includes?: XMentionsResponse['includes']
): string[] {
  const mediaKeys = mention.attachments?.media_keys || [];
  if (!mediaKeys.length || !includes?.media) {
    return [];
  }

  const mediaUrls: string[] = [];
  for (const key of mediaKeys) {
    const media = includes.media.find((m) => m.media_key === key);
    if (!media) continue;

    // For photos, use the direct URL
    if (media.type === 'photo' && media.url) {
      mediaUrls.push(media.url);
    }
    // For videos, use preview image
    else if ((media.type === 'video' || media.type === 'animated_gif') && media.preview_image_url) {
      mediaUrls.push(media.preview_image_url);
    }
  }

  return mediaUrls;
}

// ---------------------------------------------------------------------------
// Extract location from mention
// ---------------------------------------------------------------------------

export function extractLocation(
  mention: XMentionRaw,
  includes?: XMentionsResponse['includes']
): { placeId?: string; coordinates?: { lat: number; lng: number } } | null {
  if (!mention.geo) {
    return null;
  }

  const result: { placeId?: string; coordinates?: { lat: number; lng: number } } = {};

  if (mention.geo.place_id) {
    result.placeId = mention.geo.place_id;
  }

  if (mention.geo.coordinates?.coordinates) {
    // X API returns [lng, lat], we want { lat, lng }
    const [lng, lat] = mention.geo.coordinates.coordinates;
    result.coordinates = { lat, lng };
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ---------------------------------------------------------------------------
// Get author handle from mention
// ---------------------------------------------------------------------------

export function getAuthorHandle(
  mention: XMentionRaw,
  includes?: XMentionsResponse['includes']
): string {
  const author = includes?.users?.find((u) => u.id === mention.author_id);
  return author ? `@${author.username}` : '@unknown';
}
