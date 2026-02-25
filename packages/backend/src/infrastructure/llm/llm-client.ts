import { BaseLLMProvider, type LLMRequest, type LLMResponse } from './providers/base-provider';
import { GeminiProvider } from './providers/gemini-provider';

export type LLMProviderType = 'gemini' | 'groq' | 'openai';

/**
 * LLMClient: Factory for creating LLM provider instances.
 *
 * Usage:
 * ```ts
 * const client = new LLMClient('gemini', process.env.GEMINI_API_KEY!);
 * const response = await client.generate({ messages: [...] });
 * ```
 */
export class LLMClient {
  private provider: BaseLLMProvider;

  constructor(providerType: LLMProviderType = 'gemini', apiKey?: string) {
    const key = apiKey || this.getApiKeyForProvider(providerType);

    if (!key) {
      throw new Error(
        `API key not found for provider: ${providerType}. Set the appropriate environment variable.`,
      );
    }

    switch (providerType) {
      case 'gemini':
        this.provider = new GeminiProvider(key);
        break;
      case 'groq':
        // Groq provider not implemented yet, fall back to Gemini
        console.warn('[LLMClient] Groq provider not implemented, falling back to Gemini');
        this.provider = new GeminiProvider(key);
        break;
      case 'openai':
        // OpenAI provider not implemented yet, fall back to Gemini
        console.warn('[LLMClient] OpenAI provider not implemented, falling back to Gemini');
        this.provider = new GeminiProvider(key);
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${providerType}`);
    }
  }

  /**
   * Generate a completion from the LLM.
   */
  async generate(request: LLMRequest): Promise<LLMResponse> {
    return this.provider.generate(request);
  }

  /**
   * Get the default model for the current provider.
   */
  get defaultModel(): string {
    return this.provider.defaultModel;
  }

  /**
   * Get the provider name.
   */
  get providerName(): string {
    return this.provider.providerName;
  }

  /**
   * Get API key from environment variables based on provider type.
   */
  private getApiKeyForProvider(providerType: LLMProviderType): string | undefined {
    switch (providerType) {
      case 'gemini':
        return process.env.GEMINI_API_KEY;
      case 'groq':
        return process.env.GROQ_API_KEY;
      case 'openai':
        return process.env.OPENAI_API_KEY;
      default:
        return undefined;
    }
  }
}

/**
 * Create an LLMClient using environment variables for configuration.
 */
export function createLLMClient(): LLMClient {
  const providerType = (process.env.LLM_PROVIDER || 'gemini') as LLMProviderType;
  return new LLMClient(providerType);
}

export default LLMClient;
