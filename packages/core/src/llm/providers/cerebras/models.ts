import type { ModelInfo } from '../types';

/**
 * Cerebras model catalog — Fast inference
 *
 * Free tier: 1M tokens/day, 30 RPM, 60K TPM. No credit card.
 * Docs: https://inference-docs.cerebras.ai/models/overview
 * Base URL: https://api.cerebras.ai
 */
export const CEREBRAS_MODELS: ModelInfo[] = [
    // ── Production ──
    {
        id: 'gpt-oss-120b',
        name: 'GPT-OSS 120B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'OpenAI open-weight, fastest on Cerebras.',
    },
    {
        id: 'llama3.1-8b',
        name: 'Llama 3.1 8B',
        tier: 'low',
        pricing: 'free',
        contextWindow: 8_192,
        description: 'Ultra-fast lightweight. ~2K tokens/sec.',
    },
    // ── Preview ──
    {
        id: 'qwen-3-235b-a22b-instruct-2507',
        name: 'Qwen 3 235B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 65_536,
        description: 'Preview. Largest free model, MoE 22B active.',
    },
    {
        id: 'qwen-3-235b-a22b-instruct-2507',
        name: 'Qwen 3 235B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 65_536,
        description: 'Preview. Largest free model, MoE 22B active.',
    },
];

export const CEREBRAS_DEFAULT_MODEL = 'llama3.1-8b';
export const CEREBRAS_BASE_URL = 'https://api.cerebras.ai';
