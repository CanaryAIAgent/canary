/**
 * Canary — Telegram Integration barrel export
 */

export { getBot, sendMessage, sendAlert, handleTelegramWebhook, setWebhook, getWebhookInfo, deleteWebhook } from './client';
export { subscribedChats } from './subscriptions';
export { broadcastAlert, registerHandlers } from './handlers';
