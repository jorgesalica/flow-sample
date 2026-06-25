import { GoogleGenAI } from '@google/genai';
import { BaseLLMProvider } from '../base-provider';
import type { LLMRequest, LLMResponse, LLMStreamEvent, LLMMessage, ModelInfo } from '../../types';
import { GEMINI_MODELS, GEMINI_DEFAULT_MODEL } from './models';
import { logger } from '../../../logger';

const log = logger.child({ module: 'GeminiProvider' });

/**
 * Gemini LLM Provider
 *
 * Uses Google's Gemini API via @google/genai SDK.
 * Model configurable via LLM_MODEL env var, defaults to gemini-2.5-flash
 */
export class GeminiProvider extends BaseLLMProvider {
    private client: GoogleGenAI;
    private _defaultModel: string;

    constructor(apiKey: string) {
        super(apiKey);
        this.client = new GoogleGenAI({ apiKey });
        this._defaultModel = process.env.LLM_MODEL || GEMINI_DEFAULT_MODEL;
        log.debug({ model: this._defaultModel }, 'GeminiProvider initialized');
    }

    get defaultModel(): string {
        return this._defaultModel;
    }

    get providerName(): string {
        return 'gemini';
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        const startTime = Date.now();
        const modelName = request.model || this.defaultModel;

        // Format messages for Gemini
        const contents = this.formatMessages(request.messages);

        const config: Record<string, unknown> = {
            temperature: request.temperature ?? 0.5,
            maxOutputTokens: request.maxTokens ?? 1024,
        };

        // Structured output: pass JSON schema to Gemini
        if (request.structuredOutput) {
            config.responseMimeType = request.structuredOutput.mimeType || 'application/json';
            config.responseJsonSchema = request.structuredOutput.jsonSchema;
        }

        const response = await this.client.models.generateContent({
            model: modelName,
            contents,
            config,
        });

        const latencyMs = Date.now() - startTime;
        const text = response.text ?? '';

        return {
            content: text,
            model: modelName,
            provider: this.providerName,
            usage: {
                inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
                outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
                totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
            },
            latencyMs,
        };
    }

    async *generateStream(request: LLMRequest): AsyncGenerator<LLMStreamEvent> {
        const startTime = Date.now();
        const modelName = request.model || this.defaultModel;
        const contents = this.formatMessages(request.messages);

        const streamConfig: Record<string, unknown> = {
            temperature: request.temperature ?? 0.5,
            maxOutputTokens: request.maxTokens ?? 1024,
        };

        if (request.structuredOutput) {
            streamConfig.responseMimeType = request.structuredOutput.mimeType || 'application/json';
            streamConfig.responseJsonSchema = request.structuredOutput.jsonSchema;
        }

        const stream = await this.client.models.generateContentStream({
            model: modelName,
            contents,
            config: streamConfig,
        });

        let fullContent = '';

        for await (const chunk of stream) {
            const text = chunk.text ?? '';
            if (text) {
                fullContent += text;
                yield { delta: text, done: false };
            }
        }

        const latencyMs = Date.now() - startTime;
        yield {
            delta: '',
            done: true,
            response: {
                content: fullContent,
                model: modelName,
                provider: this.providerName,
                usage: {
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                },
                latencyMs,
            },
        };
    }

    async listModels(): Promise<string[]> {
        try {
            const modelsResult = await this.client.models.list();
            const list: string[] = [];
            for await (const m of modelsResult as AsyncIterable<{ name?: string; model?: string }>) {
                const name = m.name || m.model || '';
                if (name && name.includes('gemini') && !name.includes('embedding')) {
                    list.push(name.replace('models/', ''));
                }
            }
            return list.length ? list : [this.defaultModel];
        } catch (error) {
            log.error({ error }, 'Error listing Gemini models');
            return GEMINI_MODELS.map((m) => m.id);
        }
    }

    listModelCatalog(): ModelInfo[] {
        return GEMINI_MODELS;
    }

    /**
     * Format messages for Gemini API.
     * Gemini uses a different format than OpenAI-style messages.
     */
    private formatMessages(
        messages: LLMMessage[],
    ): Array<{ role: string; parts: Array<{ text: string }> }> {
        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
        let systemPrompt = '';

        for (const msg of messages) {
            if (msg.role === 'system') {
                // Gemini handles system prompts differently, prepend to first user message
                systemPrompt += msg.content + '\n\n';
            } else {
                const role = msg.role === 'assistant' ? 'model' : 'user';
                let content = msg.content;

                // Prepend system prompt to first user message
                if (systemPrompt && role === 'user') {
                    content = systemPrompt + content;
                    systemPrompt = '';
                }

                contents.push({
                    role,
                    parts: [{ text: content }],
                });
            }
        }

        return contents;
    }
}

export default GeminiProvider;
