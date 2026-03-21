/**
 * Canary — Telegram Webhook Setup
 *
 * GET  /api/telegram/setup — check current webhook status
 * POST /api/telegram/setup — register/update the webhook URL with Telegram
 *
 * Call POST once after deployment to point Telegram at your webhook endpoint.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET env vars.
 */

import { setWebhook, getWebhookInfo, deleteWebhook } from '@/lib/integrations/telegram';

export async function GET() {
  try {
    const info = await getWebhookInfo();
    return Response.json({ success: true, data: info });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get webhook info' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const baseUrl = body.baseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

    if (!baseUrl) {
      return Response.json(
        {
          success: false,
          error: 'Provide baseUrl in request body, or set NEXT_PUBLIC_APP_URL / VERCEL_URL env var',
        },
        { status: 400 },
      );
    }

    const protocol = baseUrl.startsWith('http') ? '' : 'https://';
    const webhookUrl = `${protocol}${baseUrl}/api/telegram/webhook`;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

    await setWebhook(webhookUrl, secret);
    const info = await getWebhookInfo();

    return Response.json({
      success: true,
      message: `Webhook registered: ${webhookUrl}`,
      data: info,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to set webhook' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    await deleteWebhook();
    return Response.json({ success: true, message: 'Webhook removed' });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete webhook' },
      { status: 500 },
    );
  }
}
