/**
 * Canary — Centralized AI model configuration.
 * Uses Vercel AI Gateway via AI_SDK_API_KEY (set in Vercel dashboard).
 * Falls back to direct Google API when only GOOGLE_GENERATIVE_AI_API_KEY is set.
 *
 * Available tiers:
 *   flash  — gemini-2.5-flash        (fast, cheap, default)
 *   pro    — gemini-2.5-pro          (deep reasoning, complex tasks)
 *   pro3   — gemini-3.1-pro-preview  (latest frontier model)
 *
 * Photo analysis model:
 *   nano-banana — gemini-3.1-flash-image-preview (Nano Banana 2)
 */

import { createGateway } from '@ai-sdk/gateway';
import { google } from '@ai-sdk/google';

// Support both env var names — user has AI_SDK_API_KEY on Vercel
const gatewayApiKey = process.env.AI_SDK_API_KEY ?? process.env.AI_GATEWAY_API_KEY;
const useGateway = Boolean(gatewayApiKey);

const gateway = createGateway({ apiKey: gatewayApiKey });

// Model tier definitions
export const MODEL_TIERS = {
  flash: {
    id: 'flash',
    label: 'Gemini 2.5 Flash',
    description: 'Fast & efficient',
    modelId: 'gemini-2.5-flash',
    gatewayId: 'google/gemini-2.5-flash',
  },
  pro: {
    id: 'pro',
    label: 'Gemini 2.5 Pro',
    description: 'Deep reasoning',
    modelId: 'gemini-2.5-pro',
    gatewayId: 'google/gemini-2.5-pro',
  },
  pro3: {
    id: 'pro3',
    label: 'Gemini 3.1 Pro',
    description: 'Frontier model',
    modelId: 'gemini-3.1-pro-preview',
    gatewayId: 'google/gemini-3.1-pro-preview',
  },
} as const;

export type ModelTier = keyof typeof MODEL_TIERS;

export const PHOTO_MODELS = {
  flash: {
    id: 'flash',
    label: 'Gemini 2.5 Flash',
    description: 'Standard analysis',
    modelId: 'gemini-2.5-flash',
    gatewayId: 'google/gemini-2.5-flash',
  },
  'nano-banana': {
    id: 'nano-banana',
    label: 'Nano Banana 2',
    description: 'Advanced image intelligence',
    modelId: 'gemini-3.1-flash-image-preview',
    gatewayId: 'google/gemini-3.1-flash-image-preview',
  },
} as const;

export type PhotoModel = keyof typeof PHOTO_MODELS;

function resolveModel(modelId: string, gatewayId: string) {
  if (useGateway) return gateway(gatewayId);
  return google(modelId);
}

/**
 * Get a model by tier. Defaults to flash.
 */
export function getModel(tier: ModelTier = 'flash') {
  const def = MODEL_TIERS[tier];
  return resolveModel(def.modelId, def.gatewayId);
}

/**
 * Get the fast reasoning model (Gemini 2.5 Flash).
 * Used for: orchestrator routing, triage, chat.
 */
export function getFlashModel() {
  return getModel('flash');
}

/**
 * Get the deep reasoning model (Gemini 2.5 Pro).
 * Used for: runbook generation, compliance assessment, complex synthesis.
 */
export function getProModel() {
  return getModel('pro');
}

/**
 * Get a photo analysis model.
 * Supports 'flash' (default) and 'nano-banana' (Nano Banana 2).
 */
export function getPhotoModel(model: PhotoModel = 'flash') {
  const def = PHOTO_MODELS[model];
  return resolveModel(def.modelId, def.gatewayId);
}
