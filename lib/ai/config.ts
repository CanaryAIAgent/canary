/**
 * Canary — Centralized AI model configuration.
 * Uses Vercel AI Gateway when AI_GATEWAY_API_KEY is set,
 * falls back to direct Google API when GOOGLE_GENERATIVE_AI_API_KEY is set.
 */

import { createGateway } from '@ai-sdk/gateway';
import { google } from '@ai-sdk/google';

// Vercel AI Gateway provider (preferred — provides observability, caching, rate limiting)
const gatewayProvider = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

const useGateway = Boolean(process.env.AI_GATEWAY_API_KEY);

/**
 * Get the fast reasoning model (Gemini 2.0 Flash or equivalent).
 * Used for: orchestrator routing, triage, photo/voice analysis.
 */
export function getFlashModel() {
  if (useGateway) {
    return gatewayProvider('google/gemini-2.0-flash');
  }
  return google('gemini-2.0-flash');
}

/**
 * Get the deep reasoning model (Gemini 2.5 Pro or equivalent).
 * Used for: runbook generation, compliance assessment, complex synthesis.
 */
export function getProModel() {
  if (useGateway) {
    return gatewayProvider('google/gemini-2.5-pro');
  }
  return google('gemini-2.5-pro');
}
