import type { ModelInfo } from '../../types';

/**
 * OpenRouter model catalog — Aggregator (free :free models)
 *
 * The router selects an available free model that supports the request's
 * capabilities, avoiding hard-coded IDs that are retired frequently.
 * Docs: https://openrouter.ai/docs/guides/routing/routers/free-router
 * Base URL: https://openrouter.ai/api
 */
export const OPENROUTER_MODELS: ModelInfo[] = [
  {
    id: 'openrouter/free',
    name: 'Free Models Router',
    tier: 'high',
    pricing: 'free',
    contextWindow: 200_000,
    description: 'Routes each request to a currently available free model.',
  },
];

export const OPENROUTER_DEFAULT_MODEL = 'openrouter/free';
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api';
