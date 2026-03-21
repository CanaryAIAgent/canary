/**
 * Canary — X Bot AI Handler
 *
 * STUB — teammate is building the full implementation.
 *
 * Receives parsed XMention payloads from the polling route,
 * analyzes the content for disaster signals, and returns a reply string.
 */

import { type XMention } from '@/lib/schemas';

export interface XBotHandlerResult {
  reply: string;
  shouldCreateIncident: boolean;
  suggestedSeverity?: number;
  extractedLocation?: string;
}

/**
 * Process an X mention and generate a reply.
 *
 * @param mention - Validated XMention payload from the polling route
 * @returns Reply text to post back to the original tweet
 */
export async function handleXMention(mention: XMention): Promise<XBotHandlerResult> {
  // STUB: This is a placeholder implementation
  // Teammate will implement full AI analysis here

  console.log('[xbot-handler] Processing mention:', {
    id: mention.id,
    author: mention.authorHandle,
    text: mention.text.slice(0, 50) + '...',
    hasMedia: mention.mediaUrls.length > 0,
    hasLocation: !!mention.geo,
  });

  // Simple heuristic for demonstration
  const hasMedia = mention.mediaUrls.length > 0;
  const hasLocation = !!mention.geo?.coordinates;
  const text = mention.text.toLowerCase();

  // Check for disaster keywords
  const isDisasterRelated =
    /flood|fire|collapse|emergency|damage|help|trapped|evacuate/i.test(mention.text);

  if (!hasMedia && !hasLocation && isDisasterRelated) {
    return {
      reply:
        'Thanks for reporting. Could you please share a photo, video, or location to help us assess the situation?',
      shouldCreateIncident: false,
    };
  }

  if (isDisasterRelated && (hasMedia || hasLocation)) {
    return {
      reply:
        'Thank you for the report. Our team is reviewing this information and will respond shortly.',
      shouldCreateIncident: true,
      suggestedSeverity: 3,
      extractedLocation: mention.geo?.coordinates
        ? `${mention.geo.coordinates.lat},${mention.geo.coordinates.lng}`
        : undefined,
    };
  }

  // Default response
  return {
    reply: 'Thanks for reaching out. Our team will review your message.',
    shouldCreateIncident: false,
  };
}
