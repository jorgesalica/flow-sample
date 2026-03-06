import type { ModelInfo } from '../types';

/**
 * Groq model catalog — GroqCloud (LPU inference)
 *
 * Free tier, no credit card. Ultra-fast inference.
 * Docs: https://console.groq.com/docs/models
 * Base URL: https://api.groq.com/openai
 */
export const GROQ_MODELS: ModelInfo[] = [
    // ── Production ──
    {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'MMLU 86%. Strong generalist. 1K RPD.',
    },
    {
        id: 'openai/gpt-oss-120b',
        name: 'GPT-OSS 120B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'OpenAI flagship open-weight. ~500 tps.',
    },
    {
        id: 'openai/gpt-oss-20b',
        name: 'GPT-OSS 20B',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'OpenAI lightweight open-weight.',
    },
    {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B',
        tier: 'low',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Fastest, lightest. 14.4K RPD, 6K TPM.',
    },
    // ── Preview ──
    {
        id: 'meta-llama/llama-4-scout-17b-16e-instruct',
        name: 'Llama 4 Scout',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 512_000,
        description: 'Preview. MoE 16 experts, huge context.',
    },
    {
        id: 'qwen/qwen3-32b',
        name: 'Qwen3 32B',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Preview. Strong multilingual.',
    },
];

export const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_BASE_URL = 'https://api.groq.com/openai';
