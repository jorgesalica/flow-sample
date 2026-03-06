import type { ModelInfo } from '../types';

/**
 * Groq model catalog — GroqCloud (LPU inference)
 *
 * Free tier, no credit card. Ultra-fast inference.
 * Base URL: https://api.groq.com/openai
 */
export const GROQ_MODELS: ModelInfo[] = [
    {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'MMLU 86%. Strong generalist. 1K RPD, 12K TPM.',
    },
    {
        id: 'llama-4-maverick-17b-128e-instruct',
        name: 'Llama 4 Maverick',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'MoE 128 experts. 1K RPD, 6K TPM.',
    },
    {
        id: 'llama-4-scout-17b-16e-instruct',
        name: 'Llama 4 Scout',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 512_000,
        description: 'MoE 16 experts, huge context. 1K RPD, 30K TPM.',
    },
    {
        id: 'qwen-qwq-32b',
        name: 'Qwen QWQ 32B',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Reasoning-focused. 1K RPD.',
    },
    {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B',
        tier: 'low',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Fastest, lightest. 14.4K RPD, 6K TPM.',
    },
];

export const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_BASE_URL = 'https://api.groq.com/openai';
