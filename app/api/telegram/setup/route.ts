/**
 * Canary — Telegram Webhook Setup
 *
 * POST /api/telegram/setup
 *
 * Registers the webhook URL with Telegram. URL resolution order:
 *   1. TELEGRAM_WEBHOOK_URL env var  (explicit — use for local tunnel URLs)
 *   2. Request body { "baseUrl" }    (manual override via curl)
 *   3. VERCEL_PROJECT_PRODUCTION_URL (auto-set by Vercel on every deployment)
 *   4. Request host header           (fallback)
 *
 * On Vercel: just call POST /api/telegram/setup with no body after deploy.
 * Locally:   set TELEGRAM_WEBHOOK_URL=https://your-tunnel.trycloudflare.com
 *            in .env.local, then call POST /api/telegram/setup.
 */

import { NextResponse } from 'next/server';
import {
  setTelegramWebhook,
  deleteTelegramWebhook,
  getTelegramMe,
} from '@/lib/integrations/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolveBaseUrl(req: Request, bodyBaseUrl?: string): string | null {
  // 1. Explicit env var (best for local dev with tunnels)
  if (process.env.TELEGRAM_WEBHOOK_URL) {
    return process.env.TELEGRAM_WEBHOOK_URL.replace(/\/+$/, '');
  }

  // 2. Request body override
  if (bodyBaseUrl) {
    return bodyBaseUrl.replace(/\/+$/, '');
  }

  // 3. Vercel auto-set production URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // 4. Infer from request headers
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) {
    return `${proto}://${host}`;
  }

  return null;
}

export async function POST(req: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' },
      { status: 500 },
    );
  }

  let bodyBaseUrl: string | undefined;
  try {
    const body = await req.json();
    bodyBaseUrl = body.baseUrl;
  } catch {
    // Body is optional
  }

  const baseUrl = resolveBaseUrl(req, bodyBaseUrl);

  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: 'Could not determine base URL. Set TELEGRAM_WEBHOOK_URL env var or pass { "baseUrl": "https://..." } in the body.' },
      { status: 400 },
    );
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  const me = await getTelegramMe();
  if (!me.ok) {
    return NextResponse.json(
      { ok: false, error: 'Bot token is invalid — getMe failed', details: me },
      { status: 500 },
    );
  }

  await deleteTelegramWebhook();

  const result = await setTelegramWebhook(webhookUrl);

  return NextResponse.json({
    ok: result.ok,
    bot: me.result,
    webhookUrl,
    source: process.env.TELEGRAM_WEBHOOK_URL
      ? 'TELEGRAM_WEBHOOK_URL env'
      : bodyBaseUrl
        ? 'request body'
        : process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? 'VERCEL_PROJECT_PRODUCTION_URL'
          : 'request headers',
    telegramResponse: result,
  });
}
