import type { ModelInfo } from '../types';

/**
 * Cerebras model catalog — Fast inference
 *
 * Free tier: 1M tokens/day, 30 RPM, 60K TPM. No credit card.
 * Base URL: https://api.cerebras.ai
 */
export const CEREBRAS_MODELS: ModelInfo[] = [
    {
        id: 'qwen-3-235b-a22b',
        name: 'Qwen 3 235B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 65_536,
        description: 'Largest free model. MoE 22B active. Strong reasoning.',
    },
    {
        id: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 8_192,
        description: 'Strong generalist. Limited context on Cerebras.',
    },
    {
        id: 'llama-4-scout-17b-16e',
        name: 'Llama 4 Scout',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 65_536,
        description: 'MoE 16 experts. Large context window.',
    },
    {
        id: 'qwen-3-32b',
        name: 'Qwen 3 32B',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 32_768,
        description: 'Solid multilingual generalist.',
    },
];

export const CEREBRAS_DEFAULT_MODEL = 'llama-3.3-70b';
export const CEREBRAS_BASE_URL = 'https://api.cerebras.ai';
