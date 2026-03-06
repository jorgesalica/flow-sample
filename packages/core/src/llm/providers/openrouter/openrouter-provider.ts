import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, ModelInfo } from '../types';
import { OPENROUTER_MODELS, OPENROUTER_DEFAULT_MODEL, OPENROUTER_BASE_URL } from './models';

/**
 * OpenRouter LLM Provider
 *
 * Aggregator with 24+ free models via OpenAI-compatible API.
 * Append `:free` to model IDs for free tier.
 */
export class OpenRouterProvider extends BaseLLMProvider {
    private _defaultModel: string;
    private baseUrl: string;

    constructor(apiKey: string) {
        super(apiKey);
        this._defaultModel = process.env.LLM_MODEL || OPENROUTER_DEFAULT_MODEL;
        this.baseUrl = OPENROUTER_BASE_URL;
        console.log(`[OpenRouterProvider] Initialized with model: ${this._defaultModel}`);
    }

    get defaultModel(): string {
        return this._defaultModel;
    }

    get providerName(): string {
        return 'openrouter';
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        const startTime = Date.now();
        const modelName = request.model || this.defaultModel;

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'https://github.com/flow-sample',
            },
            body: JSON.stringify({
                model: modelName,
                messages: request.messages,
                temperature: request.temperature ?? 0.5,
                max_tokens: request.maxTokens ?? 1024,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`[OpenRouterProvider] API error ${response.status}: ${error}`);
        }

        const data = await response.json();
        const latencyMs = Date.now() - startTime;

        return {
            content: data.choices?.[0]?.message?.content ?? '',
            model: data.model ?? modelName,
            provider: this.providerName,
            usage: {
                inputTokens: data.usage?.prompt_tokens ?? 0,
                outputTokens: data.usage?.completion_tokens ?? 0,
                totalTokens: data.usage?.total_tokens ?? 0,
            },
            latencyMs,
        };
    }

    async listModels(): Promise<string[]> {
        return OPENROUTER_MODELS.map((m) => m.id);
    }

    listModelCatalog(): ModelInfo[] {
        return OPENROUTER_MODELS;
    }
}

export default OpenRouterProvider;
