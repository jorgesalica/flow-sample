import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, ModelInfo } from '../types';
import { CEREBRAS_MODELS, CEREBRAS_DEFAULT_MODEL, CEREBRAS_BASE_URL } from './models';

/**
 * Cerebras LLM Provider
 *
 * Fast inference via OpenAI-compatible API.
 * Free tier: 1M tokens/day, 30 RPM.
 */
export class CerebrasProvider extends BaseLLMProvider {
    private _defaultModel: string;
    private baseUrl: string;

    constructor(apiKey: string) {
        super(apiKey);
        this._defaultModel = process.env.LLM_MODEL || CEREBRAS_DEFAULT_MODEL;
        this.baseUrl = CEREBRAS_BASE_URL;
        console.log(`[CerebrasProvider] Initialized with model: ${this._defaultModel}`);
    }

    get defaultModel(): string {
        return this._defaultModel;
    }

    get providerName(): string {
        return 'cerebras';
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
            throw new Error(`[CerebrasProvider] API error ${response.status}: ${error}`);
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
        return CEREBRAS_MODELS.map((m) => m.id);
    }

    listModelCatalog(): ModelInfo[] {
        return CEREBRAS_MODELS;
    }
}

export default CerebrasProvider;
