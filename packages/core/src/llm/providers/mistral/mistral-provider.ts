import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, LLMStreamEvent, ModelInfo } from '../types';
import { parseOpenAIStream } from '../stream-parser';
import { MISTRAL_MODELS, MISTRAL_DEFAULT_MODEL, MISTRAL_BASE_URL } from './models';

/**
 * Mistral LLM Provider — La Plateforme
 *
 * Free "Experiment" tier via OpenAI-compatible API.
 * Global: 1 req/sec. Standard pool: 50K TPM, 4M tokens/month.
 */
export class MistralProvider extends BaseLLMProvider {
    private _defaultModel: string;
    private baseUrl: string;

    constructor(apiKey: string) {
        super(apiKey);
        this._defaultModel = process.env.LLM_MODEL || MISTRAL_DEFAULT_MODEL;
        this.baseUrl = MISTRAL_BASE_URL;
        console.log(`[MistralProvider] Initialized with model: ${this._defaultModel}`);
    }

    get defaultModel(): string {
        return this._defaultModel;
    }

    get providerName(): string {
        return 'mistral';
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        const startTime = Date.now();
        const modelName = request.model || this.defaultModel;

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
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
            throw new Error(`[MistralProvider] API error ${response.status}: ${error}`);
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

    async *generateStream(request: LLMRequest): AsyncGenerator<LLMStreamEvent> {
        const startTime = Date.now();
        const modelName = request.model || this.defaultModel;

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: modelName,
                messages: request.messages,
                temperature: request.temperature ?? 0.5,
                max_tokens: request.maxTokens ?? 1024,
                stream: true,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`[MistralProvider] API error ${response.status}: ${error}`);
        }

        yield* parseOpenAIStream(response, this.providerName, modelName, startTime);
    }

    async listModels(): Promise<string[]> {
        return MISTRAL_MODELS.map((m) => m.id);
    }

    listModelCatalog(): ModelInfo[] {
        return MISTRAL_MODELS;
    }
}

export default MistralProvider;
