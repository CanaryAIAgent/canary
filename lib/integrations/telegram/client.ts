/**
 * Canary — Telegram Bot Client
 *
 * Lazy-initialized grammY Bot instance used by webhook handler and agent tools.
 * The bot operates in webhook mode (no long-polling) so it's compatible
 * with serverless / Vercel functions.
 *
 * The bot is created lazily to avoid throwing during build when
 * TELEGRAM_BOT_TOKEN is not available.
 */

import { Bot, webhookCallback } from 'grammy';

let _bot: Bot | null = null;
let _webhookHandler: ((req: Request) => Promise<Response>) | null = null;

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN is not set. Get one from @BotFather on Telegram.',
    );
  }
  return token;
}

/**
 * Get the singleton Bot instance (lazy — only created on first call).
 */
export function getBot(): Bot {
  if (!_bot) {
    _bot = new Bot(getToken());
  }
  return _bot;
}

/**
 * Convenience re-export for code that wants `bot` directly.
 * Will throw if called without TELEGRAM_BOT_TOKEN.
 */
export const bot = new Proxy({} as Bot, {
  get(_target, prop, receiver) {
    return Reflect.get(getBot(), prop, receiver);
  },
});

/**
 * grammY webhook adapter for Web-standard Request/Response (Next.js App Router).
 * Returns a function: (req: Request) => Promise<Response>
 */
export function handleTelegramWebhook(req: Request): Promise<Response> {
  if (!_webhookHandler) {
    _webhookHandler = webhookCallback(getBot(), 'std/http');
  }
  return _webhookHandler(req);
}

/**
 * Send a plain-text message to a Telegram chat.
 */
export async function sendMessage(chatId: number | string, text: string) {
  return getBot().api.sendMessage(chatId, text, { parse_mode: 'HTML' });
}

/**
 * Send a formatted alert to a Telegram chat with severity badge.
 */
export async function sendAlert(
  chatId: number | string,
  opts: {
    title: string;
    severity: number;
    summary: string;
    location?: string;
    source?: string;
  },
) {
  const severityEmoji =
    opts.severity >= 5
      ? '🔴'
      : opts.severity >= 4
        ? '🟠'
        : opts.severity >= 3
          ? '🟡'
          : '🟢';

  const lines = [
    `${severityEmoji} <b>CANARY ALERT — Severity ${opts.severity}/5</b>`,
    '',
    `<b>${opts.title}</b>`,
    opts.summary,
  ];

  if (opts.location) lines.push(`📍 ${opts.location}`);
  if (opts.source) lines.push(`📡 Source: ${opts.source}`);
  lines.push('', `<i>${new Date().toISOString()}</i>`);

  return getBot().api.sendMessage(chatId, lines.join('\n'), { parse_mode: 'HTML' });
}

/**
 * Register the webhook URL with Telegram's API.
 * Call this once from /api/telegram/setup.
 */
export async function setWebhook(url: string, secret?: string) {
  return getBot().api.setWebhook(url, {
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
}

/**
 * Retrieve current webhook info from Telegram.
 */
export async function getWebhookInfo() {
  return getBot().api.getWebhookInfo();
}

/**
 * Remove the webhook (revert to long-polling mode).
 */
export async function deleteWebhook() {
  return getBot().api.deleteWebhook({ drop_pending_updates: true });
}
