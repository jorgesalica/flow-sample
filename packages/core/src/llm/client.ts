import type { LLMRequest, LLMResponse, LLMStreamEvent, ModelInfo } from './types';
import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseLLMProvider } from './providers/base-provider';
import { GeminiProvider } from './providers/gemini/gemini-provider';
import { GroqProvider } from './providers/groq/groq-provider';
import { OpenRouterProvider } from './providers/openrouter/openrouter-provider';
import { CerebrasProvider } from './providers/cerebras/cerebras-provider';
import { MistralProvider } from './providers/mistral/mistral-provider';
import { createLLMConfigFromEnv, getProviderEnvVar, type LLMRuntimeConfig } from './env';

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

  constructor(providerType: LLMProviderType = 'gemini', apiKey?: string, defaultModel?: string) {
    const runtime = createLLMConfigFromEnv();
    const key = apiKey || runtime.apiKeys[providerType];

    if (!key) {
      throw new Error(
        `API key not found for provider: ${providerType}. ` +
          `Set the env var: ${getProviderEnvVar(providerType)}.`,
      );
    }

    this.provider = createProviderInstance(providerType, key, defaultModel || runtime.model);
  }

  // ── Rotation factory ─────────────────────────────────────────────

  /**
   * Create an LLMClient that rotates through all configured free providers.
   * On 429 or error, it tries the next provider in the list.
   * Only providers with API keys set in env will be included.
   */
  static createRotation(config: LLMRuntimeConfig = createLLMConfigFromEnv()): LLMClient {
    const providers: BaseLLMProvider[] = [];

    for (const type of FREE_ROTATION_ORDER) {
      const key = config.apiKeys[type];
      if (key) {
        // A global model override only makes sense in direct mode. Each
        // rotation provider must use a model from its own catalog.
        providers.push(createProviderInstance(type, key));
      }
    }

    if (providers.length === 0) {
      throw new Error(
        `[LLMClient] No free providers configured. Set at least one of: ` +
          FREE_ROTATION_ORDER.map(getProviderEnvVar).join(', '),
      );
    }

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
    const { value } = await this.generateObjectWithMetadata(request, schema);
    return value;
  }

  /** Generate a typed object and retain the provider response metadata. */
  async generateObjectWithMetadata<T>(
    request: LLMRequest,
    schema: ZodType<T>,
  ): Promise<{ value: T; response: LLMResponse }> {
    // zod-to-json-schema@3 types target zod v3; this project is on zod v4, so the
    // ZodType shapes don't overlap. Cast through `unknown` (avoids `any`) — runtime is fine.
    const jsonSchema = zodToJsonSchema(
      schema as unknown as Parameters<typeof zodToJsonSchema>[0],
    ) as Record<string, unknown>;

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
      return {
        value: schema.parse(JSON.parse(stripJsonFences(response.content))) as T,
        response,
      };
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
      return {
        value: schema.parse(JSON.parse(stripJsonFences(retryResponse.content))) as T,
        response: retryResponse,
      };
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
  static getModelCatalogGrouped(
    config: LLMRuntimeConfig = createLLMConfigFromEnv(),
  ): { provider: string; models: ModelInfo[] }[] {
    const groups: { provider: string; models: ModelInfo[] }[] = [];
    const ALL_PROVIDERS: LLMProviderType[] = [
      'gemini',
      'groq',
      'openrouter',
      'cerebras',
      'mistral',
    ];

    for (const type of ALL_PROVIDERS) {
      const key = config.apiKeys[type];
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

  private static parseProviderModel(providerAndModel: string): {
    provider: BaseLLMProvider;
    modelId: string;
  } {
    const colonIdx = providerAndModel.indexOf(':');
    if (colonIdx === -1) {
      throw new Error(
        `Invalid model format "${providerAndModel}". Expected "provider:model" (e.g. "groq:llama-3.3-70b-versatile").`,
      );
    }

    const providerType = providerAndModel.slice(0, colonIdx) as LLMProviderType;
    const modelId = providerAndModel.slice(colonIdx + 1);

    const key = createLLMConfigFromEnv().apiKeys[providerType];
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

/** Strip ```json fences some models wrap structured output in. */
function stripJsonFences(content: string): string {
  let out = content.trim();
  if (out.startsWith('```json')) {
    out = out.replace(/^```json\n?/, '');
  } else if (out.startsWith('```')) {
    out = out.replace(/^```\n?/, '');
  }
  if (out.endsWith('```')) {
    out = out.replace(/```$/, '');
  }
  return out.trim();
}

function createProviderInstance(
  type: LLMProviderType,
  apiKey: string,
  defaultModel?: string,
): BaseLLMProvider {
  switch (type) {
    case 'gemini':
      return new GeminiProvider(apiKey, defaultModel);
    case 'groq':
      return new GroqProvider(apiKey, defaultModel);
    case 'openrouter':
      return new OpenRouterProvider(apiKey, defaultModel);
    case 'cerebras':
      return new CerebrasProvider(apiKey, defaultModel);
    case 'mistral':
      return new MistralProvider(apiKey, defaultModel);
    default:
      throw new Error(`Unsupported LLM provider: ${type}`);
  }
}
