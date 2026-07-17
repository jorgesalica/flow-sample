import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMClient } from '../../src/llm/client';
import type { LLMRequest, LLMResponse, LLMStreamEvent, ModelInfo } from '../../src/llm/types';

// ── Mock helpers ──────────────────────────────────────────────────────

function okResponse(provider: string): LLMResponse {
    return {
        content: `hello from ${provider}`,
        model: 'test-model',
        provider,
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        latencyMs: 10,
    };
}

function makeTestProvider(name: string) {
    return {
        providerName: name,
        defaultModel: `${name}-model`,
        generate: vi.fn<[LLMRequest], Promise<LLMResponse>>(),
        generateStream: vi.fn<[LLMRequest], AsyncGenerator<LLMStreamEvent>>(),
        listModels: vi.fn().mockResolvedValue([]),
        listModelCatalog: vi.fn().mockReturnValue([
            { id: `${name}-id`, name: `${name} Model`, tier: 'medium', pricing: 'free', contextWindow: 128_000 } as ModelInfo,
        ]),
    };
}

function makeDirectClient(provider: ReturnType<typeof makeTestProvider>): LLMClient {
    const client = Object.create(LLMClient.prototype) as LLMClient;
    Reflect.set(client, 'provider', provider);
    Reflect.set(client, 'rotationProviders', null);
    Reflect.set(client, 'rotationIndex', 0);
    return client;
}

function makeRotationClient(providers: ReturnType<typeof makeTestProvider>[]): LLMClient {
    const client = Object.create(LLMClient.prototype) as LLMClient;
    Reflect.set(client, 'provider', providers[0]);
    Reflect.set(client, 'rotationProviders', providers);
    Reflect.set(client, 'rotationIndex', 0);
    return client;
}

function setRotationIndex(client: LLMClient, index: number): void {
    Reflect.set(client, 'rotationIndex', index);
}

function clearProviderCache(): void {
    const cache = Reflect.get(LLMClient, 'providerCache') as Map<unknown, unknown>;
    cache.clear();
}

async function* toAsyncGen(events: LLMStreamEvent[]): AsyncGenerator<LLMStreamEvent> {
    for (const e of events) {
        yield e;
    }
}

// ── Factory / constructor tests ───────────────────────────────────────

describe('LLMClient constructor', () => {
    const ENV_KEYS = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY', 'MISTRAL_API_KEY'];
    let origEnv: Record<string, string | undefined>;

    beforeEach(() => {
        origEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
        for (const k of ENV_KEYS) delete process.env[k];
        clearProviderCache();
    });

    afterEach(() => {
        for (const [k, v] of Object.entries(origEnv)) {
            if (v === undefined) delete process.env[k];
            else process.env[k] = v;
        }
    });

    it('throws when no API key env var is set for the requested provider', () => {
        expect(() => new LLMClient('groq')).toThrow(/API key not found for provider: groq/);
    });

    it('error message names the expected env var', () => {
        expect(() => new LLMClient('groq')).toThrow('GROQ_API_KEY');
    });

    it('throws for createRotation when no free provider env vars are set', () => {
        expect(() => LLMClient.createRotation()).toThrow(/No free providers configured/);
    });

    it('uses each provider default when rotation receives a global model override', () => {
        const client = LLMClient.createRotation({
            provider: 'rotation',
            model: 'gemini-2.5-flash',
            apiKeys: {
                groq: 'groq-key',
                openrouter: 'openrouter-key',
                cerebras: 'cerebras-key',
                mistral: 'mistral-key',
            },
        });
        const providers = Reflect.get(client, 'rotationProviders') as Array<{
            providerName: string;
            defaultModel: string;
        }>;

        expect(Object.fromEntries(providers.map((provider) => [
            provider.providerName,
            provider.defaultModel,
        ]))).toEqual({
            groq: 'llama-3.3-70b-versatile',
            openrouter: 'openrouter/free',
            cerebras: 'gpt-oss-120b',
            mistral: 'mistral-small-latest',
        });
    });
});

// ── Direct mode ───────────────────────────────────────────────────────

describe('LLMClient direct mode', () => {
    it('isRotation is false for a direct client', () => {
        const p1 = makeTestProvider('groq');
        const client = makeDirectClient(p1);
        expect(client.isRotation).toBe(false);
    });

    it('listAllModelCatalogs returns only current provider in direct mode', () => {
        const p1 = makeTestProvider('groq');
        const client = makeDirectClient(p1);
        const catalogs = client.listAllModelCatalogs();
        expect(catalogs).toHaveLength(1);
        expect(catalogs[0].id).toBe('groq-id');
    });
});

// ── Rotation algorithm — generate() ──────────────────────────────────

describe('LLMClient rotation — generate()', () => {
    const req: LLMRequest = { messages: [{ role: 'user', content: 'hi' }] };

    it('calls the first provider on the first request', async () => {
        const p1 = makeTestProvider('groq');
        p1.generate.mockResolvedValue(okResponse('groq'));
        const client = makeRotationClient([p1]);

        const res = await client.generate(req);
        expect(res.provider).toBe('groq');
        expect(p1.generate).toHaveBeenCalledOnce();
    });

    it('advances rotationIndex after a successful call', async () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        p1.generate.mockResolvedValue(okResponse('groq'));
        p2.generate.mockResolvedValue(okResponse('openrouter'));
        const client = makeRotationClient([p1, p2]);

        await client.generate(req);
        const res2 = await client.generate(req);
        expect(res2.provider).toBe('openrouter');
    });

    it('falls back to the next provider on error', async () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        p1.generate.mockRejectedValue(new Error('network error'));
        p2.generate.mockResolvedValue(okResponse('openrouter'));
        const client = makeRotationClient([p1, p2]);

        const res = await client.generate(req);
        expect(res.provider).toBe('openrouter');
    });

    it('falls back on 429 rate-limit error', async () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        p1.generate.mockRejectedValue(new Error('429 Too Many Requests'));
        p2.generate.mockResolvedValue(okResponse('openrouter'));
        const client = makeRotationClient([p1, p2]);

        const res = await client.generate(req);
        expect(res.provider).toBe('openrouter');
    });

    it('throws "All N rotation providers failed" when every provider fails', async () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        p1.generate.mockRejectedValue(new Error('fail1'));
        p2.generate.mockRejectedValue(new Error('fail2'));
        const client = makeRotationClient([p1, p2]);

        await expect(client.generate(req)).rejects.toThrow('All 2 rotation providers failed');
    });

    it('tries all providers before giving up', async () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        const p3 = makeTestProvider('cerebras');
        p1.generate.mockRejectedValue(new Error('fail'));
        p2.generate.mockRejectedValue(new Error('fail'));
        p3.generate.mockResolvedValue(okResponse('cerebras'));
        const client = makeRotationClient([p1, p2, p3]);

        const res = await client.generate(req);
        expect(res.provider).toBe('cerebras');
        expect(p1.generate).toHaveBeenCalledOnce();
        expect(p2.generate).toHaveBeenCalledOnce();
        expect(p3.generate).toHaveBeenCalledOnce();
    });

    it('wraps around the ring when rotationIndex starts mid-ring', async () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        p1.generate.mockResolvedValue(okResponse('groq'));
        p2.generate.mockResolvedValue(okResponse('openrouter'));
        const client = makeRotationClient([p1, p2]);
        setRotationIndex(client, 1);

        const res = await client.generate(req);
        expect(res.provider).toBe('openrouter');

        const res2 = await client.generate(req);
        expect(res2.provider).toBe('groq');
    });
});

// ── Rotation algorithm — generateStream() ────────────────────────────

describe('LLMClient rotation — generateStream()', () => {
    const req: LLMRequest = { messages: [{ role: 'user', content: 'hi' }] };

    async function collectStream(client: LLMClient): Promise<LLMStreamEvent[]> {
        const events: LLMStreamEvent[] = [];
        for await (const e of client.generateStream(req)) {
            events.push(e);
        }
        return events;
    }

    it('yields events from the first healthy provider', async () => {
        const p1 = makeTestProvider('groq');
        const streamEvents: LLMStreamEvent[] = [
            { delta: 'hello', done: false },
            { delta: '', done: true, response: okResponse('groq') },
        ];
        p1.generateStream.mockReturnValue(toAsyncGen(streamEvents));
        const client = makeRotationClient([p1]);

        const events = await collectStream(client);
        expect(events).toHaveLength(2);
        expect(events[0].delta).toBe('hello');
        expect(events[1].done).toBe(true);
    });

    it('falls back to the next provider when the stream throws', async () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        const failStream = async function* (): AsyncGenerator<LLMStreamEvent> {
            throw new Error('stream error');
        };
        p1.generateStream.mockReturnValue(failStream());
        p2.generateStream.mockReturnValue(
            toAsyncGen([
                { delta: 'ok', done: false },
                { delta: '', done: true, response: okResponse('openrouter') },
            ]),
        );
        const client = makeRotationClient([p1, p2]);

        const events = await collectStream(client);
        const done = events.find((e) => e.done);
        expect(done?.response?.provider).toBe('openrouter');
    });

    it('throws "All N rotation providers failed (stream)" when every stream fails', async () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        const fail = async function* (): AsyncGenerator<LLMStreamEvent> {
            throw new Error('fail');
        };
        p1.generateStream.mockReturnValue(fail());
        p2.generateStream.mockReturnValue(
            (async function* (): AsyncGenerator<LLMStreamEvent> {
                throw new Error('fail2');
            })(),
        );
        const client = makeRotationClient([p1, p2]);

        await expect(collectStream(client)).rejects.toThrow('All 2 rotation providers failed (stream)');
    });
});

// ── Metadata & helpers ────────────────────────────────────────────────

describe('LLMClient metadata', () => {
    it('isRotation is true for a rotation client', () => {
        const client = makeRotationClient([makeTestProvider('groq')]);
        expect(client.isRotation).toBe(true);
    });

    it('listAllModelCatalogs returns combined catalogs in rotation mode', () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        const client = makeRotationClient([p1, p2]);
        const catalogs = client.listAllModelCatalogs();
        expect(catalogs).toHaveLength(2);
        expect(catalogs.map((m: ModelInfo) => m.id)).toEqual(['groq-id', 'openrouter-id']);
    });

    it('providerName reflects the current provider', () => {
        const client = makeRotationClient([makeTestProvider('cerebras')]);
        expect(client.providerName).toBe('cerebras');
    });
});

// ── parseProviderModel (via generateForProvider) ──────────────────────

describe('LLMClient.parseProviderModel', () => {
    it('throws on input without a colon separator', async () => {
        const req: LLMRequest = { messages: [] };
        await expect(LLMClient.generateForProvider('invalid-no-colon', req)).rejects.toThrow(
            /Invalid model format/,
        );
    });

    it('throws when the provider has no configured API key', async () => {
        const orig = process.env.GROQ_API_KEY;
        delete process.env.GROQ_API_KEY;
        try {
            const req: LLMRequest = { messages: [] };
            await expect(LLMClient.generateForProvider('groq:some-model', req)).rejects.toThrow(
                /API key not configured for provider: groq/,
            );
        } finally {
            if (orig !== undefined) process.env.GROQ_API_KEY = orig;
        }
    });

    it('extracts only the first colon — model IDs with colons are preserved', async () => {
        // openrouter model IDs contain a colon: "meta-llama/...:free"
        // parseProviderModel should split on the FIRST colon only
        process.env.OPENROUTER_API_KEY = 'test-key';
        const req: LLMRequest = { messages: [] };
        // We can't call generate (no real API), but we can verify the error comes from
        // an API call attempt (meaning parsing succeeded), not from a format error.
        try {
            await LLMClient.generateForProvider('openrouter:meta-llama/llama-3.3-70b-instruct:free', req);
        } catch (err) {
            const msg = (err as Error).message;
            expect(msg).not.toMatch(/Invalid model format/);
        } finally {
            delete process.env.OPENROUTER_API_KEY;
            clearProviderCache();
        }
    });
});

// ── listModelCatalog in direct mode ──────────────────────────────────

describe('LLMClient listModelCatalog', () => {
    it('returns catalog from the current provider in direct mode', () => {
        const p1 = makeTestProvider('groq');
        const client = makeDirectClient(p1);
        const catalog = client.listModelCatalog();
        expect(catalog).toHaveLength(1);
        expect(catalog[0].id).toBe('groq-id');
    });
});

// ── Rotation error messages ───────────────────────────────────────────

describe('LLMClient rotation — error messages', () => {
    const req: LLMRequest = { messages: [{ role: 'user', content: 'hi' }] };

    it('all-failed error includes the last error text', async () => {
        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        p1.generate.mockRejectedValue(new Error('groq-fail'));
        p2.generate.mockRejectedValue(new Error('the-last-error'));
        const client = makeRotationClient([p1, p2]);

        await expect(client.generate(req)).rejects.toThrow('the-last-error');
    });

    it('all-failed stream error includes the last error text', async () => {
        const fail = (msg: string) =>
            (async function* (): AsyncGenerator<LLMStreamEvent> {
                throw new Error(msg);
            })();

        const p1 = makeTestProvider('groq');
        const p2 = makeTestProvider('openrouter');
        p1.generateStream.mockReturnValue(fail('stream-fail-1'));
        p2.generateStream.mockReturnValue(fail('stream-fail-final'));
        const client = makeRotationClient([p1, p2]);

        const events: LLMStreamEvent[] = [];
        await expect(
            (async () => { for await (const e of client.generateStream(req)) events.push(e); })()
        ).rejects.toThrow('stream-fail-final');
    });
});
