/**
 * Canary — Telegram Bot Webhook
 *
 * POST /api/telegram/webhook
 *
 * Receives Telegram updates and handles bot commands:
 *   /start       — Welcome message
 *   /subscribe   — Subscribe to alerts for a zip code
 *   /unsubscribe — Stop receiving alerts
 *   /status      — Show current subscription
 *   /help        — Show available commands
 */

import { NextResponse, after } from 'next/server';
import { sendTelegramMessage } from '@/lib/integrations/telegram';
import {
  dbUpsertTelegramSubscriber,
  dbGetSubscriberByChatId,
  dbDeactivateSubscriberByChatId,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Telegram update shape (subset we care about)
// ---------------------------------------------------------------------------

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

const WELCOME_TEXT = `*Welcome to Canary* 🐦

Canary is an AI-powered emergency intelligence platform. Subscribe to receive real-time incident alerts.

*Getting started:*
/subscribe — Subscribe to all alerts
/subscribe 90210 — Only alerts for zip code 90210
/subscribe 90210,90211 — Only alerts for specific zip codes

*Other commands:*
/status — Check your subscription
/unsubscribe — Stop receiving alerts
/help — Show this message`;

const HELP_TEXT = `*Canary Bot Commands*

/subscribe — Subscribe to all alerts
/subscribe <zip> — Filter alerts by zip code
/subscribe <zip> <severity> — Filter by zip and min severity (1-5)

/unsubscribe — Stop all alerts
/status — Show your current subscription
/help — Show this message`;

async function handleStart(chatId: number): Promise<void> {
  await sendTelegramMessage(chatId, WELCOME_TEXT);
}

async function handleHelp(chatId: number): Promise<void> {
  await sendTelegramMessage(chatId, HELP_TEXT);
}

async function handleSubscribe(chatId: number, args: string): Promise<void> {
  const parts = args.trim().split(/\s+/).filter(Boolean);

  let zipCodes: string[] = [];
  let minSeverity = 1;

  if (parts[0]) {
    zipCodes = parts[0].split(',').map((z) => z.trim()).filter(Boolean);

    const invalidZips = zipCodes.filter((z) => !/^\d{5}(-\d{4})?$/.test(z));
    if (invalidZips.length > 0) {
      await sendTelegramMessage(
        chatId,
        `❌ Invalid zip code(s): ${invalidZips.join(', ')}\n\nPlease use 5-digit US zip codes, or just /subscribe for all alerts.`,
      );
      return;
    }

    if (zipCodes.length > 10) {
      await sendTelegramMessage(chatId, '❌ Maximum 10 zip codes per subscription.');
      return;
    }
  }

  if (parts[1]) {
    const parsed = parseInt(parts[1], 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 5) {
      await sendTelegramMessage(chatId, '❌ Severity must be between 1 and 5.');
      return;
    }
    minSeverity = parsed;
  }

  try {
    const { isNew } = await dbUpsertTelegramSubscriber(
      String(chatId),
      zipCodes,
      minSeverity,
    );

    const verb = isNew ? 'Subscribed' : 'Updated subscription';
    const scope = zipCodes.length > 0
      ? `Zip codes: ${zipCodes.join(', ')}`
      : 'Scope: All alerts';
    await sendTelegramMessage(
      chatId,
      `✅ *${verb}!*\n\n${scope}\nMinimum severity: ${minSeverity}/5\n\nYou'll receive alerts when incidents match your criteria.`,
    );
  } catch (err) {
    console.error('[telegram/webhook] subscribe error:', err);
    await sendTelegramMessage(chatId, '❌ Something went wrong. Please try again.');
  }
}

async function handleUnsubscribe(chatId: number): Promise<void> {
  try {
    await dbDeactivateSubscriberByChatId(String(chatId));
    await sendTelegramMessage(
      chatId,
      '✅ You have been unsubscribed from all Canary alerts.\n\nUse /subscribe to resubscribe anytime.',
    );
  } catch (err) {
    console.error('[telegram/webhook] unsubscribe error:', err);
    await sendTelegramMessage(chatId, '❌ Something went wrong. Please try again.');
  }
}

async function handleStatus(chatId: number): Promise<void> {
  try {
    const sub = await dbGetSubscriberByChatId(String(chatId));
    if (!sub || !sub.isActive) {
      await sendTelegramMessage(
        chatId,
        'You are not currently subscribed.\n\nUse /subscribe to get started.',
      );
      return;
    }

    const scope = sub.zipCodes.length > 0
      ? `Zip codes: ${sub.zipCodes.join(', ')}`
      : 'Scope: All alerts';
    await sendTelegramMessage(
      chatId,
      `*Your Subscription*\n\n${scope}\nMinimum severity: ${sub.minSeverity}/5\nStatus: Active ✅`,
    );
  } catch (err) {
    console.error('[telegram/webhook] status error:', err);
    await sendTelegramMessage(chatId, '❌ Something went wrong. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  let body: TelegramUpdate;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const message = body.message;
  if (!message?.text || !message.chat) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text.trim();

  // Parse command: /command@botname args → command, args
  const match = text.match(/^\/(\w+)(?:@\w+)?\s*(.*)/);
  if (!match) {
    return NextResponse.json({ ok: true });
  }

  const command = match[1].toLowerCase();
  const args = match[2];

  // Respond to Telegram immediately, process the command in the background.
  // Telegram delivers updates sequentially — it won't send the next update
  // until we respond to this one.
  after(async () => {
    switch (command) {
      case 'start':
        await handleStart(chatId);
        break;
      case 'help':
        await handleHelp(chatId);
        break;
      case 'subscribe':
        await handleSubscribe(chatId, args);
        break;
      case 'unsubscribe':
        await handleUnsubscribe(chatId);
        break;
      case 'status':
        await handleStatus(chatId);
        break;
      default:
        await sendTelegramMessage(
          chatId,
          `Unknown command: /${command}\n\nType /help to see available commands.`,
        );
    }
  });

  return NextResponse.json({ ok: true });
}
