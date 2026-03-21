/**
 * Canary — Centralized AI model configuration.
 * Uses Vercel AI Gateway via AI_SDK_API_KEY (set in Vercel dashboard).
 * Falls back to direct Google API when only GOOGLE_GENERATIVE_AI_API_KEY is set.
 */

import { createGateway } from '@ai-sdk/gateway';
import { google } from '@ai-sdk/google';

// Support both env var names — user has AI_SDK_API_KEY on Vercel
const gatewayApiKey = process.env.AI_SDK_API_KEY ?? process.env.AI_GATEWAY_API_KEY;
const useGateway = Boolean(gatewayApiKey);

const gateway = createGateway({ apiKey: gatewayApiKey });

/**
 * Get the fast reasoning model (Gemini 2.0 Flash).
 * Used for: orchestrator routing, triage, photo/voice analysis, chat.
 */
export function getFlashModel() {
  if (useGateway) return gateway('google/gemini-2.0-flash');
  return google('gemini-2.0-flash');
}

/**
 * Get the deep reasoning model (Gemini 2.5 Pro).
 * Used for: runbook generation, compliance assessment, complex synthesis.
 */
export function getProModel() {
  if (useGateway) return gateway('google/gemini-2.5-pro');
  return google('gemini-2.5-pro');
}
