/**
 * @flows/core/llm — Entry point
 *
 * Re-exports the LLMClient, factory, types, and all providers.
 */

// ── Client ───────────────────────────────────────────────────────────
export { LLMClient, type LLMProviderType } from './llm-client';

// ── Factory ──────────────────────────────────────────────────────────
import { LLMClient, type LLMProviderType } from './llm-client';

/**
 * Create an LLMClient using environment variables.
 *
 * - LLM_PROVIDER=rotation → rotates across free providers
 * - LLM_PROVIDER=groq     → uses Groq directly
 * - Defaults to gemini
 */
export function createLLMClient(): LLMClient {
    const providerType = process.env.LLM_PROVIDER || 'gemini';

    if (providerType === 'rotation') {
        return LLMClient.createRotation();
    }

    return new LLMClient(providerType as LLMProviderType);
}

// ── Types ────────────────────────────────────────────────────────────
export type {
    LLMMessage,
    LLMRequest,
    LLMResponse,
    LLMUsage,
    ModelTier,
    ModelPricing,
    ModelInfo,
} from './providers/types';

// ── Providers ────────────────────────────────────────────────────────
export { BaseLLMProvider } from './providers/base-provider';
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
