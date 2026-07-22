import { BaseLLMProvider } from './base-provider';
import type { LLMRequest, LLMResponse, LLMStreamEvent, ModelInfo } from '../types';
import { parseOpenAIStream } from './stream-parser';

export interface OpenAICompatibleConfig {
  baseUrl: string;
  providerName: string;
  defaultModel: string;
  catalog: ModelInfo[];
  extraHeaders?: Record<string, string>;
}

/**
 * Concrete base for all OpenAI-compatible providers (Groq, OpenRouter, Cerebras, Mistral).
 * Subclasses only need to pass a config object — no logic to duplicate.
 */
export class OpenAICompatibleProvider extends BaseLLMProvider {
  private readonly cfg: OpenAICompatibleConfig;
  private readonly _defaultModel: string;

  constructor(apiKey: string, cfg: OpenAICompatibleConfig, defaultModel?: string) {
    super(apiKey);
    this.cfg = cfg;
    this._defaultModel = defaultModel || cfg.defaultModel;
    console.log(`[${cfg.providerName}] Initialized with model: ${this._defaultModel}`);
  }

  get defaultModel(): string {
    return this._defaultModel;
  }

  get providerName(): string {
    return this.cfg.providerName;
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...this.cfg.extraHeaders,
    };
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelName = request.model || this.defaultModel;

    const response = await fetch(`${this.cfg.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: modelName,
        messages: request.messages,
        temperature: request.temperature ?? 0.5,
        max_tokens: request.maxTokens ?? 1024,
        ...(request.structuredOutput ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`[${this.cfg.providerName}] API error ${response.status}: ${error}`);
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

    const response = await fetch(`${this.cfg.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
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
      throw new Error(`[${this.cfg.providerName}] API error ${response.status}: ${error}`);
    }

    yield* parseOpenAIStream(response, this.providerName, modelName, startTime);
  }

  async listModels(): Promise<string[]> {
    return this.cfg.catalog.map((m) => m.id);
  }

  listModelCatalog(): ModelInfo[] {
    return this.cfg.catalog;
  }
}
