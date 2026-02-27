/**
 * Base LLM Provider Interface
 *
 * Abstract interface for all LLM providers (Gemini, Groq, OpenAI, etc.)
 * Enables provider-agnostic LLM calls across all flows.
 */

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMRequest {
    messages: LLMMessage[];
    temperature?: number;
    maxTokens?: number;
    model?: string; // Optional override for default model
}

export interface LLMUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export interface LLMResponse {
    content: string;
    model: string;
    usage: LLMUsage;
    latencyMs: number;
}

/**
 * Abstract base class for LLM providers.
 * All providers must implement the generate method.
 */
export abstract class BaseLLMProvider {
    protected apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Generate a completion from the LLM.
     */
    abstract generate(request: LLMRequest): Promise<LLMResponse>;

    /**
     * Get the default model for this provider.
     */
    abstract get defaultModel(): string;

    /**
     * Get the provider name.
     */
    abstract get providerName(): string;

    /**
     * List dynamically fetchable models from this provider, if supported.
     */
    abstract listModels(): Promise<string[]>;
}

export default BaseLLMProvider;
