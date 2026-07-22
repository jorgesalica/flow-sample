/**
 * Base LLM Provider
 *
 * Abstract class for all LLM providers (Gemini, Groq, OpenRouter, etc.)
 * Enables provider-agnostic LLM calls across all flows.
 */

import type { LLMRequest, LLMResponse, LLMStreamEvent, ModelInfo } from '../types';

export abstract class BaseLLMProvider {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** Generate a completion from the LLM. */
  abstract generate(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Generate a streaming completion from the LLM.
   * Yields text deltas, then a final event with the complete response.
   *
   * Default implementation: falls back to `generate()` and yields the full content at once.
   */
  async *generateStream(request: LLMRequest): AsyncGenerator<LLMStreamEvent> {
    const response = await this.generate(request);
    yield { delta: response.content, done: false };
    yield { delta: '', done: true, response };
  }

  /** Get the default model for this provider. */
  abstract get defaultModel(): string;

  /** Get the provider name. */
  abstract get providerName(): string;

  /** List dynamically fetchable models from this provider, if supported. */
  abstract listModels(): Promise<string[]>;

  /** Get the static model catalog with tier/pricing metadata. */
  abstract listModelCatalog(): ModelInfo[];
}

export default BaseLLMProvider;
