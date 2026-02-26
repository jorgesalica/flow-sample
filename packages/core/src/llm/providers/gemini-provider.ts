import { GoogleGenAI } from '@google/genai';
import {
    BaseLLMProvider,
    type LLMRequest,
    type LLMResponse,
    type LLMMessage,
} from './base-provider';

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
        this._defaultModel = process.env.LLM_MODEL || 'gemini-2.5-flash';
        console.log(`[GeminiProvider] Initialized with model: ${this._defaultModel}`);
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

        const response = await this.client.models.generateContent({
            model: modelName,
            contents,
            config: {
                temperature: request.temperature ?? 0.5,
                maxOutputTokens: request.maxTokens ?? 1024,
            },
        });

        const latencyMs = Date.now() - startTime;
        const text = response.text ?? '';

        return {
            content: text,
            model: modelName,
            usage: {
                inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
                outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
                totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
            },
            latencyMs,
        };
    }

    async listModels(): Promise<string[]> {
        try {
            const modelsResult = await this.client.models.list();
            const list: string[] = [];
            for await (const m of modelsResult as any) {
                const name = m.name || m.model || '';
                // Keep only gemini models, ignore embeddings and other services
                if (name && name.includes('gemini') && !name.includes('embedding')) {
                    // Extract model name without the "models/" prefix
                    list.push(name.replace('models/', ''));
                }
            }
            return list.length ? list : [this.defaultModel];
        } catch (e) {
            console.error('[GeminiProvider] Error listing models:', e);
            // Fallback to defaults if SDK list fails or lacks permission
            return [
                'gemini-2.5-flash',
                'gemini-2.5-pro',
                'gemini-2.0-flash',
                'gemini-1.5-flash',
                'gemini-1.5-pro'
            ];
        }
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
