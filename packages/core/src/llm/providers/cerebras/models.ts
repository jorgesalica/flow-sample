import type { ModelInfo } from '../../types';

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
  // ── Preview ──
  {
    id: 'zai-glm-4.7',
    name: 'Z.ai GLM 4.7',
    tier: 'high',
    pricing: 'free',
    contextWindow: 131_072,
    description: 'Preview model for reasoning, coding, and tool use.',
  },
];

export const CEREBRAS_DEFAULT_MODEL = 'gpt-oss-120b';
export const CEREBRAS_BASE_URL = 'https://api.cerebras.ai';
