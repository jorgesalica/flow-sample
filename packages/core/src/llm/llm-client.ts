import type { LLMRequest, LLMResponse, LLMStreamEvent, ModelInfo } from './providers/types';
import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseLLMProvider } from './providers/base-provider';
import { GeminiProvider } from './providers/gemini/gemini-provider';
import { GroqProvider } from './providers/groq/groq-provider';
import { OpenRouterProvider } from './providers/openrouter/openrouter-provider';
import { CerebrasProvider } from './providers/cerebras/cerebras-provider';
import { MistralProvider } from './providers/mistral/mistral-provider';

export type LLMProviderType = 'gemini' | 'groq' | 'openrouter' | 'cerebras' | 'mistral';

// ── Free provider rotation order ─────────────────────────────────────
const FREE_ROTATION_ORDER: LLMProviderType[] = ['groq', 'openrouter', 'cerebras', 'mistral'];

/**
 * LLMClient: Factory & facade for LLM providers.
 *
 * Two modes of operation:
 *
 * 1. **Direct** — Use a specific provider + model:
 *    ```ts
 *    const client = new LLMClient('groq');
 *    const res = await client.generate({ messages: [...] });
 *    ```
 *
 * 2. **Rotation** — Cycle through free providers on 429/error:
 *    ```ts
 *    const client = LLMClient.createRotation();
 *    const res = await client.generate({ messages: [...] });
 *    // res.provider tells you which one answered
 *    ```
 */
export class LLMClient {
    private provider: BaseLLMProvider;
    private rotationProviders: BaseLLMProvider[] | null = null;
    private rotationIndex = 0;

    constructor(providerType: LLMProviderType = 'gemini', apiKey?: string) {
        const key = apiKey || getApiKeyForProvider(providerType);

        if (!key) {
            throw new Error(
                `API key not found for provider: ${providerType}. ` +
                `Set the env var: ${getEnvVarName(providerType)}.`,
            );
        }

        this.provider = createProviderInstance(providerType, key);
    }

    // ── Rotation factory ─────────────────────────────────────────────

    /**
     * Create an LLMClient that rotates through all configured free providers.
     * On 429 or error, it tries the next provider in the list.
     * Only providers with API keys set in env will be included.
     */
    static createRotation(): LLMClient {
        const providers: BaseLLMProvider[] = [];

        for (const type of FREE_ROTATION_ORDER) {
            const key = getApiKeyForProvider(type);
            if (key) {
                providers.push(createProviderInstance(type, key));
            }
        }

        if (providers.length === 0) {
            throw new Error(
                `[LLMClient] No free providers configured. Set at least one of: ` +
                FREE_ROTATION_ORDER.map((t) => getEnvVarName(t)).join(', '),
            );
        }

        // Use first provider as initial, rotation will cycle through all
        const client = Object.create(LLMClient.prototype) as LLMClient;
        client.provider = providers[0];
        client.rotationProviders = providers;
        client.rotationIndex = 0;

        console.log(
            `[LLMClient] Rotation mode with ${providers.length} providers: ` +
            providers.map((p) => p.providerName).join(' → '),
        );
        return client;
    }

    // ── Core methods ─────────────────────────────────────────────────

    /** Generate a completion. In rotation mode, retries with next provider on failure. */
    async generate(request: LLMRequest): Promise<LLMResponse> {
        if (this.rotationProviders) {
            return this.generateWithRotation(request);
        }
        return this.provider.generate(request);
    }

    /** Generate a streaming completion. Yields text deltas, then a final done event. */
    async *generateStream(request: LLMRequest): AsyncGenerator<LLMStreamEvent> {
        if (this.rotationProviders) {
            yield* this.generateStreamWithRotation(request);
        } else {
            yield* this.provider.generateStream(request);
        }
    }

    /**
     * Generate a typed object from the LLM using structured output.
     *
     * Converts the Zod schema to JSON Schema, sends it to the provider,
     * parses and validates the response. Retries once on validation failure.
     *
     * @param request - Standard LLM request (messages, temperature, etc.)
     * @param schema  - Zod schema defining the expected response shape
     * @returns Validated, typed object
     *
     * @example
     * ```ts
     * const result = await client.generateObject(
     *   { messages: [{ role: 'user', content: 'Analyze this text' }] },
     *   z.object({ sentiment: z.string(), score: z.number() })
     * );
     * // result is typed as { sentiment: string; score: number }
     * ```
     */
    async generateObject<T>(request: LLMRequest, schema: ZodType<T>): Promise<T> {
        const jsonSchema = zodToJsonSchema(schema as any) as Record<string, unknown>;

        const structuredRequest: LLMRequest = {
            ...request,
            structuredOutput: {
                jsonSchema,
                mimeType: 'application/json',
            },
        };

        // First attempt
        const response = await this.generate(structuredRequest);

        try {
            let content = response.content.trim();
            if (content.startsWith('```json')) {
                content = content.replace(/^```json\n?/, '');
                if (content.endsWith('```')) {
                    content = content.replace(/```$/, '');
                }
            } else if (content.startsWith('```')) {
                content = content.replace(/^```\n?/, '');
                if (content.endsWith('```')) {
                    content = content.replace(/```$/, '');
                }
            }
            const parsed = JSON.parse(content.trim());
            return schema.parse(parsed) as T;
        } catch (firstError) {
            console.warn(
                `[LLMClient] generateObject validation failed, retrying once. Error: ${
                    firstError instanceof Error ? firstError.message : String(firstError)
                }`,
            );

            // Retry with corrective prompt
            const retryRequest: LLMRequest = {
                ...structuredRequest,
                messages: [
                    ...request.messages,
                    {
                        role: 'assistant',
                        content: response.content,
                    },
                    {
                        role: 'user',
                        content:
                            'Your previous response did not match the required JSON schema. ' +
                            'Please try again, ensuring the output is valid JSON matching the schema exactly.',
                    },
                ],
            };

            const retryResponse = await this.generate(retryRequest);
            
            let retryContent = retryResponse.content.trim();
            if (retryContent.startsWith('```json')) {
                retryContent = retryContent.replace(/^```json\n?/, '');
                if (retryContent.endsWith('```')) {
                    retryContent = retryContent.replace(/```$/, '');
                }
            } else if (retryContent.startsWith('```')) {
                retryContent = retryContent.replace(/^```\n?/, '');
                if (retryContent.endsWith('```')) {
                    retryContent = retryContent.replace(/```$/, '');
                }
            }
            
            const retryParsed = JSON.parse(retryContent.trim());
            return schema.parse(retryParsed) as T;
        }
    }

    /** List available models dynamically from the current provider. */
    async listModels(): Promise<string[]> {
        return this.provider.listModels();
    }

    /** Get the static model catalog from the current provider. */
    listModelCatalog(): ModelInfo[] {
        return this.provider.listModelCatalog();
    }

    /** Get all model catalogs across all rotation providers (or just the current one). */
    listAllModelCatalogs(): ModelInfo[] {
        if (this.rotationProviders) {
            return this.rotationProviders.flatMap((p) => p.listModelCatalog());
        }
        return this.provider.listModelCatalog();
    }

    get defaultModel(): string {
        return this.provider.defaultModel;
    }

    get providerName(): string {
        return this.provider.providerName;
    }

    /** Whether this client is in rotation mode. */
    get isRotation(): boolean {
        return this.rotationProviders !== null;
    }

    // ── Static helpers for per-request usage ─────────────────────────

    /** Cache of provider instances by type (avoids re-creating on every call). */
    private static providerCache = new Map<LLMProviderType, BaseLLMProvider>();

    /**
     * Get model catalogs grouped by provider.
     * Returns all providers that have API keys configured.
     */
    static getModelCatalogGrouped(): { provider: string; models: ModelInfo[] }[] {
        const groups: { provider: string; models: ModelInfo[] }[] = [];
        const ALL_PROVIDERS: LLMProviderType[] = ['gemini', 'groq', 'openrouter', 'cerebras', 'mistral'];

        for (const type of ALL_PROVIDERS) {
            const key = getApiKeyForProvider(type);
            if (!key) continue;

            const provider = LLMClient.getOrCreateProvider(type, key);
            groups.push({
                provider: provider.providerName,
                models: provider.listModelCatalog(),
            });
        }
        return groups;
    }

    /**
     * One-shot generate with a specific provider + model.
     * Parses "provider:model" format (e.g. "groq:llama-3.3-70b-versatile").
     */
    static async generateForProvider(
        providerAndModel: string,
        request: LLMRequest,
    ): Promise<LLMResponse> {
        const { provider, modelId } = LLMClient.parseProviderModel(providerAndModel);
        return provider.generate({ ...request, model: modelId });
    }

    /**
     * One-shot streaming generate with a specific provider + model.
     * Parses "provider:model" format.
     */
    static async *generateStreamForProvider(
        providerAndModel: string,
        request: LLMRequest,
    ): AsyncGenerator<LLMStreamEvent> {
        const { provider, modelId } = LLMClient.parseProviderModel(providerAndModel);
        yield* provider.generateStream({ ...request, model: modelId });
    }

    private static parseProviderModel(providerAndModel: string): { provider: BaseLLMProvider; modelId: string } {
        const colonIdx = providerAndModel.indexOf(':');
        if (colonIdx === -1) {
            throw new Error(
                `Invalid model format "${providerAndModel}". Expected "provider:model" (e.g. "groq:llama-3.3-70b-versatile").`,
            );
        }

        const providerType = providerAndModel.slice(0, colonIdx) as LLMProviderType;
        const modelId = providerAndModel.slice(colonIdx + 1);

        const key = getApiKeyForProvider(providerType);
        if (!key) {
            throw new Error(`API key not configured for provider: ${providerType}`);
        }

        return { provider: LLMClient.getOrCreateProvider(providerType, key), modelId };
    }

    private static getOrCreateProvider(type: LLMProviderType, apiKey: string): BaseLLMProvider {
        let provider = LLMClient.providerCache.get(type);
        if (!provider) {
            provider = createProviderInstance(type, apiKey);
            LLMClient.providerCache.set(type, provider);
        }
        return provider;
    }

    // ── Private ──────────────────────────────────────────────────────

    private async generateWithRotation(request: LLMRequest): Promise<LLMResponse> {
        const providers = this.rotationProviders!;
        const startIdx = this.rotationIndex;
        let lastError: Error | null = null;

        for (let i = 0; i < providers.length; i++) {
            const idx = (startIdx + i) % providers.length;
            const provider = providers[idx];

            try {
                const response = await provider.generate(request);
                this.rotationIndex = (idx + 1) % providers.length;
                this.provider = providers[this.rotationIndex];
                return response;
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                const is429 = errMsg.includes('429') || errMsg.includes('rate');
                console.warn(
                    `[LLMClient] ${provider.providerName} failed` +
                    `${is429 ? ' (rate limited)' : ''}: ${errMsg}`,
                );
                lastError = error instanceof Error ? error : new Error(errMsg);
            }
        }

        throw new Error(
            `[LLMClient] All ${providers.length} rotation providers failed. ` +
            `Last error: ${lastError?.message}`,
        );
    }

    private async *generateStreamWithRotation(request: LLMRequest): AsyncGenerator<LLMStreamEvent> {
        const providers = this.rotationProviders!;
        const startIdx = this.rotationIndex;
        let lastError: Error | null = null;

        for (let i = 0; i < providers.length; i++) {
            const idx = (startIdx + i) % providers.length;
            const provider = providers[idx];

            try {
                const gen = provider.generateStream(request);
                let started = false;

                for await (const event of gen) {
                    started = true;
                    yield event;
                }

                if (started) {
                    this.rotationIndex = (idx + 1) % providers.length;
                    this.provider = providers[this.rotationIndex];
                    return;
                }
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.warn(`[LLMClient] ${provider.providerName} stream failed: ${errMsg}`);
                lastError = error instanceof Error ? error : new Error(errMsg);
            }
        }

        throw new Error(
            `[LLMClient] All ${providers.length} rotation providers failed (stream). ` +
            `Last error: ${lastError?.message}`,
        );
    }
}

// ── Helpers (module-level) ───────────────────────────────────────────

function createProviderInstance(type: LLMProviderType, apiKey: string): BaseLLMProvider {
    switch (type) {
        case 'gemini':
            return new GeminiProvider(apiKey);
        case 'groq':
            return new GroqProvider(apiKey);
        case 'openrouter':
            return new OpenRouterProvider(apiKey);
        case 'cerebras':
            return new CerebrasProvider(apiKey);
        case 'mistral':
            return new MistralProvider(apiKey);
        default:
            throw new Error(`Unsupported LLM provider: ${type}`);
    }
}

function getApiKeyForProvider(providerType: LLMProviderType): string | undefined {
    const envMap: Record<LLMProviderType, string> = {
        gemini: 'GEMINI_API_KEY',
        groq: 'GROQ_API_KEY',
        openrouter: 'OPENROUTER_API_KEY',
        cerebras: 'CEREBRAS_API_KEY',
        mistral: 'MISTRAL_API_KEY',
    };
    return process.env[envMap[providerType]];
}

function getEnvVarName(type: LLMProviderType): string {
    const envMap: Record<LLMProviderType, string> = {
        gemini: 'GEMINI_API_KEY',
        groq: 'GROQ_API_KEY',
        openrouter: 'OPENROUTER_API_KEY',
        cerebras: 'CEREBRAS_API_KEY',
        mistral: 'MISTRAL_API_KEY',
    };
    return envMap[type];
}
