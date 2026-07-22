/**
 * @flows/core/llm — Entry point
 *
 * Re-exports the LLMClient, factory, types, and all providers.
 */

// ── Client ───────────────────────────────────────────────────────────
export { LLMClient, type LLMProviderType } from './client';

// ── Factory ──────────────────────────────────────────────────────────
import { LLMClient, type LLMProviderType } from './client';
import { createLLMConfigFromEnv, type LLMEnv } from './env';

/**
 * Create an LLMClient using environment variables.
 *
 * - LLM_PROVIDER=rotation → rotates across free providers
 * - LLM_PROVIDER=groq     → uses Groq directly
 * - Defaults to gemini
 */
export function createLLMClientFromEnv(env?: LLMEnv): LLMClient {
  const config = createLLMConfigFromEnv(env);

  if (config.provider === 'rotation') {
    return LLMClient.createRotation(config);
  }

  return new LLMClient(config.provider, config.apiKeys[config.provider], config.model);
}

export const createLLMClient = createLLMClientFromEnv;
export { createLLMConfigFromEnv, type LLMEnv, type LLMRuntimeConfig } from './env';

// ── Types ────────────────────────────────────────────────────────────
export type {
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMUsage,
  LLMStreamEvent,
  ModelTier,
  ModelPricing,
  ModelInfo,
} from './types';

// ── Providers ────────────────────────────────────────────────────────
export { BaseLLMProvider } from './providers/base-provider';
export { OpenAICompatibleProvider } from './providers/openai-compatible';
export type { OpenAICompatibleConfig } from './providers/openai-compatible';
export { GeminiProvider } from './providers/gemini/gemini-provider';
export { GroqProvider } from './providers/groq/groq-provider';
export { OpenRouterProvider } from './providers/openrouter/openrouter-provider';
export { CerebrasProvider } from './providers/cerebras/cerebras-provider';
export { MistralProvider } from './providers/mistral/mistral-provider';

// ── Model catalogs ──────────────────────────────────────────────────
export { GEMINI_MODELS } from './providers/gemini/models';
export { GROQ_MODELS } from './providers/groq/models';
export { OPENROUTER_MODELS } from './providers/openrouter/models';
export { CEREBRAS_MODELS } from './providers/cerebras/models';
export { MISTRAL_MODELS } from './providers/mistral/models';
