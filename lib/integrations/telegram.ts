/**
 * Canary — Telegram Bot API Client & Notification Dispatcher
 *
 * Lightweight wrapper around the Telegram Bot API using raw fetch().
 * No external dependencies required.
 *
 * Import patterns:
 *   import { sendTelegramMessage, notifyTelegramSubscribers } from '@/lib/integrations/telegram';
 */

const TELEGRAM_API = 'https://api.telegram.org';

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return token;
}

function apiUrl(method: string): string {
  return `${TELEGRAM_API}/bot${getToken()}/${method}`;
}

// ---------------------------------------------------------------------------
// Core API methods
// ---------------------------------------------------------------------------

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { parseMode?: 'Markdown' | 'HTML' },
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  try {
    const res = await fetch(apiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode ?? 'Markdown',
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('[telegram] sendMessage failed:', data.description);
      return { ok: false, error: data.description };
    }
    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[telegram] sendMessage error:', msg);
    return { ok: false, error: msg };
  }
}

export async function setTelegramWebhook(
  url: string,
): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(apiUrl('setWebhook'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function deleteTelegramWebhook(): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(apiUrl('deleteWebhook'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return res.json();
}

export async function getTelegramMe(): Promise<{
  ok: boolean;
  result?: { id: number; first_name: string; username: string };
}> {
  const res = await fetch(apiUrl('getMe'));
  return res.json();
}

// ---------------------------------------------------------------------------
// Notification dispatcher — fan out alerts to matching subscribers
// ---------------------------------------------------------------------------

interface IncidentAlert {
  id: string;
  title: string;
  type: string;
  severity: number;
  status: string;
  description?: string;
  locationDescription?: string;
  locationZipCode?: string;
}

function formatAlertMessage(incident: IncidentAlert): string {
  const severityEmoji = incident.severity >= 4 ? '🚨' : incident.severity >= 3 ? '⚠️' : 'ℹ️';
  const lines = [
    `${severityEmoji} *CANARY ALERT — Severity ${incident.severity}/5*`,
    '',
    `*${incident.title}*`,
    `Type: ${incident.type}`,
  ];

  if (incident.locationDescription) {
    lines.push(`Location: ${incident.locationDescription}`);
  }
  lines.push(`Status: ${incident.status}`);

  if (incident.description) {
    lines.push('', incident.description);
  }

  lines.push('', '—', 'Reply /status to check your subscription.', 'Reply /unsubscribe to stop alerts.');
  return lines.join('\n');
}

export async function notifyTelegramSubscribers(
  incident: IncidentAlert,
): Promise<{ sent: number; failed: number }> {
  const { dbGetTelegramSubscribersForIncident } = await import('@/lib/db');

  const subscribers = await dbGetTelegramSubscribersForIncident(
    incident.locationZipCode ?? null,
    incident.severity,
  );

  if (subscribers.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const message = formatAlertMessage(incident);

  const results = await Promise.allSettled(
    subscribers.map((sub) => sendTelegramMessage(sub.telegramChatId, message)),
  );

  let sent = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.ok) {
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`[telegram] Notified ${sent}/${subscribers.length} subscribers for incident ${incident.id} (${failed} failed)`);
  return { sent, failed };
}
