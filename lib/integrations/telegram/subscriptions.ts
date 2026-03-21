/**
 * Canary — Telegram Subscription Store (MVP)
 *
 * In-memory set of chat IDs that have opted in to receive alerts.
 * In production, persist these in Supabase or Vercel KV.
 */

export const subscribedChats = new Set<number>();
