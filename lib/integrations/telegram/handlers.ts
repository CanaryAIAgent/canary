/**
 * Canary — Telegram Bot Command & Message Handlers
 *
 * Registers all bot commands and conversation flows.
 * Call `registerHandlers()` once before processing the first webhook update.
 */

import { getBot, sendAlert } from './client';
import { getDashboardData, addSignal, addActivity } from '@/lib/data/store';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getFlashModel } from '@/lib/ai/config';
import { subscribedChats } from './subscriptions';
import type { Bot } from 'grammy';

let _registered = false;

const SignalAnalysisSchema = z.object({
  isEmergency: z.boolean(),
  severity: z.number().int().min(1).max(5),
  category: z.enum([
    'flood', 'fire', 'structural', 'medical', 'hazmat', 'infrastructure', 'other',
  ]),
  title: z.string().max(60),
  summary: z.string().max(200),
  credibility: z.number().int().min(0).max(100),
  extractedLocation: z.string().optional(),
  recommendedAction: z.enum(['dispatch', 'triage', 'monitor', 'ignore']),
});

function setupCommands(b: Bot) {
  // ── /start ─────────────────────────────────────────────────────

  b.command('start', async (ctx) => {
    await ctx.reply(
      `🐦 <b>Canary EOC Bot</b>\n\n` +
        `I'm the AI assistant for your Emergency Operations Center.\n\n` +
        `<b>Commands:</b>\n` +
        `/status — Current EOC dashboard summary\n` +
        `/report &lt;text&gt; — Submit a field report for AI analysis\n` +
        `/subscribe — Receive live alerts in this chat\n` +
        `/unsubscribe — Stop receiving alerts\n` +
        `/help — Show this message`,
      { parse_mode: 'HTML' },
    );
  });

  b.command('help', async (ctx) => {
    await ctx.reply(
      `<b>Canary EOC Commands</b>\n\n` +
        `/status — Dashboard summary with active incidents, signal health, and recommendations\n` +
        `/report &lt;description&gt; — Submit a field report (text). AI will analyze severity, classify, and push to the EOC dashboard.\n` +
        `/subscribe — Register this chat for real-time alerts when new high-severity signals are ingested\n` +
        `/unsubscribe — Remove this chat from alert notifications\n` +
        `/help — Show this help message`,
      { parse_mode: 'HTML' },
    );
  });

  // ── /status ────────────────────────────────────────────────────

  b.command('status', async (ctx) => {
    const data = getDashboardData();
    const s = data.stats;

    const signalSummary =
      data.signals.length > 0
        ? data.signals
            .slice(0, 3)
            .map((sig) => `  • ${sig.title ?? 'Untitled'} (${sig.tag ?? 'N/A'})`)
            .join('\n')
        : '  No active signals';

    const recText = data.aiRecommendation.actionSequence || 'No active recommendation';

    await ctx.reply(
      `📊 <b>EOC Dashboard Status</b>\n\n` +
        `<b>Active Incidents:</b> ${s.activeIncidents} ${s.incidentDelta ? `(${s.incidentDelta})` : ''}\n` +
        `<b>Resource Requests:</b> ${s.resourceRequests} — ${s.resourceStatus || 'N/A'}\n` +
        `<b>Deployment ETA:</b> ${s.deploymentEtaMinutes}m\n` +
        `<b>Signal Health:</b> ${s.signalHealthPct}%\n\n` +
        `<b>Recent Signals:</b>\n${signalSummary}\n\n` +
        `<b>AI Recommendation:</b>\n${recText}`,
      { parse_mode: 'HTML' },
    );
  });

  // ── /subscribe & /unsubscribe ──────────────────────────────────

  b.command('subscribe', async (ctx) => {
    const chatId = ctx.chat.id;
    subscribedChats.add(chatId);
    await ctx.reply(
      `✅ This chat is now <b>subscribed</b> to Canary alerts.\n` +
        `You'll receive real-time notifications for severity 3+ signals.\n\n` +
        `Use /unsubscribe to stop.`,
      { parse_mode: 'HTML' },
    );
    addActivity('Telegram Bot', `Chat ${chatId} subscribed to alerts`);
  });

  b.command('unsubscribe', async (ctx) => {
    const chatId = ctx.chat.id;
    subscribedChats.delete(chatId);
    await ctx.reply(
      `🔕 This chat has been <b>unsubscribed</b> from Canary alerts.`,
      { parse_mode: 'HTML' },
    );
    addActivity('Telegram Bot', `Chat ${chatId} unsubscribed from alerts`);
  });

  // ── /report <text> ─────────────────────────────────────────────

  b.command('report', async (ctx) => {
    const text = ctx.match;
    if (!text || text.trim().length === 0) {
      await ctx.reply(
        '⚠️ Please include a description.\n\nExample: <code>/report Flooding on Oak Street, water rising past curb, two cars stalled</code>',
        { parse_mode: 'HTML' },
      );
      return;
    }

    await ctx.reply('🔍 Analyzing your field report…');

    try {
      const sender =
        ctx.from?.username
          ? `@${ctx.from.username}`
          : ctx.from?.first_name ?? 'Telegram User';

      const { object: analysis } = await generateObject({
        model: getFlashModel(),
        schema: SignalAnalysisSchema,
        prompt: `Analyze this field report submitted via Telegram for emergency relevance and severity.

Reporter: ${sender}
Report Text: ${text}

Classify the signal, assess credibility (0-100), extract location if mentioned, and recommend an action.`,
      });

      const tagPrefix =
        analysis.severity >= 4 ? 'CRITICAL' : analysis.severity >= 3 ? 'ALERT' : 'MONITOR';
      const tagColor =
        analysis.severity >= 4
          ? 'text-error'
          : analysis.severity >= 3
            ? 'text-tertiary'
            : 'text-on-surface-variant';

      const card = addSignal({
        tag: `${tagPrefix} // TELEGRAM`,
        tagColor,
        title: analysis.title,
        desc: analysis.summary,
        source: `Telegram: ${sender}`,
        credibility: analysis.credibility,
        credibilityColor:
          analysis.credibility >= 80
            ? 'bg-tertiary'
            : analysis.credibility >= 50
              ? 'bg-warning'
              : 'bg-error',
        time: 'just now',
        icon: 'send',
      });

      addActivity(
        'Telegram Bot',
        `Field report from ${sender}: "${analysis.title}" — severity ${analysis.severity}, action: ${analysis.recommendedAction}`,
      );

      const severityEmoji =
        analysis.severity >= 4
          ? '🔴'
          : analysis.severity >= 3
            ? '🟡'
            : '🟢';

      await ctx.reply(
        `${severityEmoji} <b>Report Analyzed</b>\n\n` +
          `<b>Title:</b> ${analysis.title}\n` +
          `<b>Category:</b> ${analysis.category}\n` +
          `<b>Severity:</b> ${analysis.severity}/5\n` +
          `<b>Credibility:</b> ${analysis.credibility}%\n` +
          `<b>Action:</b> ${analysis.recommendedAction}\n` +
          (analysis.extractedLocation ? `<b>Location:</b> ${analysis.extractedLocation}\n` : '') +
          `\n<i>Signal ID: ${card.id} — pushed to EOC dashboard</i>`,
        { parse_mode: 'HTML' },
      );

      if (analysis.severity >= 3) {
        await broadcastAlert({
          title: analysis.title,
          severity: analysis.severity,
          summary: analysis.summary,
          location: analysis.extractedLocation,
          source: `Telegram: ${sender}`,
        }, ctx.chat.id);
      }
    } catch (error) {
      console.error('[telegram/report] analysis error', error);
      await ctx.reply('❌ Analysis failed. Please try again or contact the EOC directly.');
    }
  });

  // ── Free-text message handler (catch-all) ──────────────────────

  b.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    await ctx.reply(
      `💬 I received your message. Use /report to submit a field report for AI analysis, or /help to see available commands.`,
      { parse_mode: 'HTML' },
    );
  });
}

/**
 * Register all bot handlers. Idempotent — safe to call multiple times.
 */
export function registerHandlers() {
  if (_registered) return;
  _registered = true;
  setupCommands(getBot());
}

// ── Alert broadcast helper ───────────────────────────────────────

async function broadcastAlert(
  opts: {
    title: string;
    severity: number;
    summary: string;
    location?: string;
    source?: string;
  },
  excludeChatId?: number,
) {
  const promises: Promise<unknown>[] = [];
  for (const chatId of subscribedChats) {
    if (chatId === excludeChatId) continue;
    promises.push(
      sendAlert(chatId, opts).catch((err) => {
        console.error(`[telegram] failed to send alert to ${chatId}`, err);
        subscribedChats.delete(chatId);
      }),
    );
  }
  await Promise.allSettled(promises);
}

export { broadcastAlert };
