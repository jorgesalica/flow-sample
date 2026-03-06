import type { ModelInfo } from '../types';

/**
 * OpenRouter model catalog — Aggregator (24+ free models)
 *
 * Free tier: 50 RPD (no credits) / 1K RPD (with $10 deposit, not consumed).
 * Use `:free` suffix on model IDs. Or `openrouter/free` auto-router.
 * Base URL: https://openrouter.ai/api
 */
export const OPENROUTER_MODELS: ModelInfo[] = [
    {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        name: 'Llama 3.3 70B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'MMLU 86%. Strong generalist via Meta.',
    },
    {
        id: 'qwen/qwen3-coder-480b-a35b:free',
        name: 'Qwen3 Coder 480B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Top coding model. 480B MoE, 35B active.',
    },
    {
        id: 'deepseek/deepseek-r1-zero:free',
        name: 'DeepSeek R1 Zero',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Strong reasoning via pure RL training.',
    },
    {
        id: 'openai/gpt-oss-120b:free',
        name: 'GPT-OSS 120B',
        tier: 'high',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'OpenAI open-weight. MMLU-Pro 90%, MoE 5.1B active.',
    },
    {
        id: 'mistralai/devstral-2512:free',
        name: 'Devstral 2',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 128_000,
        description: '123B agentic coding model from Mistral.',
    },
    {
        id: 'qwen/qwq-32b:free',
        name: 'QWQ 32B',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Reasoning-focused Qwen variant.',
    },
    {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Flash',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 1_000_000,
        description: 'Google experimental. 1M context.',
    },
    {
        id: 'google/gemma-3-27b-it:free',
        name: 'Gemma 3 27B',
        tier: 'medium',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Google open-weight, solid generalist.',
    },
    {
        id: 'nvidia/llama-3.1-nemotron-nano-12b-v2:free',
        name: 'Nemotron Nano 12B',
        tier: 'low',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'NVIDIA edge-optimized, very fast.',
    },
    {
        id: 'google/gemma-3-4b-it:free',
        name: 'Gemma 3 4B',
        tier: 'low',
        pricing: 'free',
        contextWindow: 128_000,
        description: 'Tiny, ultra-fast for simple tasks.',
    },
];

export const OPENROUTER_DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api';
