import type { ModelInfo } from '../types';

/**
 * Mistral model catalog — La Plateforme
 *
 * Free "Experiment" tier. 1 req/sec, 50K TPM, 4M tokens/month (standard pool).
 * mistral-large has its own pool with much higher quota.
 * Base URL: https://api.mistral.ai
 */
export const MISTRAL_MODELS: ModelInfo[] = [
    {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Flagship. Own pool with huge monthly quota.',
    },
    {
        id: 'codestral-latest',
        name: 'Codestral',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 256_000,
        description: 'Code-specialized. 256K context. Standard pool.',
    },
    {
        id: 'mistral-small-latest',
        name: 'Mistral Small',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Efficient generalist. Standard pool.',
    },
    {
        id: 'devstral-small-latest',
        name: 'Devstral Small',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Agentic coding. Standard pool.',
    },
    {
        id: 'open-mistral-nemo',
        name: 'Mistral Nemo',
        tier: 'low',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Lightweight open model. Standard pool.',
    },
    {
        id: 'pixtral-large-latest',
        name: 'Pixtral Large',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Vision + text. Standard pool.',
    },
];

export const MISTRAL_DEFAULT_MODEL = 'mistral-small-latest';
export const MISTRAL_BASE_URL = 'https://api.mistral.ai';
