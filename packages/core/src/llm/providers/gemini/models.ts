import type { ModelInfo } from '../../types';

/**
 * Gemini model catalog — Google AI Studio / Vertex AI
 *
 * These models use your Google Cloud billing / AI Studio API key.
 * Pricing: paid (consumes trial credits or billing).
 */
export const GEMINI_MODELS: ModelInfo[] = [
    {
        id: 'gemini-3.1-pro',
        name: 'Gemini 3.1 Pro',
        tier: 'very_high',
        pricing: 'paid',
        contextWindow: 1_000_000,
        description: 'Frontier model. Top reasoning, coding, and analysis.',
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        tier: 'very_high',
        pricing: 'paid',
        contextWindow: 1_000_000,
        description: 'Previous-gen flagship. Strong reasoning with thinking.',
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        tier: 'high',
        pricing: 'paid',
        contextWindow: 1_000_000,
        description: 'Fast and capable. Great balance of speed and quality.',
    },
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash-Lite',
        tier: 'medium',
        pricing: 'paid',
        contextWindow: 1_000_000,
        description: 'Lightest Gemini. High throughput, lower cost.',
    },
];

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
