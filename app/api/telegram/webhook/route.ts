/**
 * Canary — Telegram Webhook Receiver
 *
 * POST /api/telegram/webhook
 *
 * Receives updates from the Telegram Bot API via webhook.
 * Handlers are registered lazily on the first request.
 */

import { handleTelegramWebhook, registerHandlers } from '@/lib/integrations/telegram';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    registerHandlers();
    return await handleTelegramWebhook(req);
  } catch (error) {
    console.error('[telegram/webhook] error processing update', error);
    return new Response('OK', { status: 200 });
  }
}
