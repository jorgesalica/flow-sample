import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAICompatibleProvider } from '../../../src/llm/providers/openai-compatible';
import type { LLMStreamEvent, ModelInfo } from '../../../src/llm/types';

// ── Test fixtures ─────────────────────────────────────────────────────

const TEST_CATALOG: ModelInfo[] = [
    { id: 'model-a', name: 'Model A', tier: 'high', pricing: 'free', contextWindow: 128_000 },
    { id: 'model-b', name: 'Model B', tier: 'low', pricing: 'free', contextWindow: 8_192 },
];

class TestProvider extends OpenAICompatibleProvider {
    constructor(apiKey: string, extraHeaders?: Record<string, string>) {
        super(apiKey, {
            baseUrl: 'https://api.test.example',
            providerName: 'testprovider',
            defaultModel: 'model-a',
            catalog: TEST_CATALOG,
            extraHeaders,
        });
    }
}

const MOCK_JSON_RESPONSE = {
    choices: [{ message: { content: 'hello world' } }],
    model: 'model-a-resolved',
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
};

function makeJsonResponse(data: unknown): Response {
    return { ok: true, status: 200, json: async () => data } as unknown as Response;
}

function makeErrorResponse(status: number, body: string): Response {
    return { ok: false, status, text: async () => body } as unknown as Response;
}

function makeStreamResponse(chunks: string[]): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
            controller.close();
        },
    });
    return { ok: true, status: 200, body: { getReader: () => stream.getReader() } } as unknown as Response;
}

function makeErrorStreamResponse(status: number, body: string): Response {
    return { ok: false, status, text: async () => body } as unknown as Response;
}

function sseData(obj: object): string {
    return `data: ${JSON.stringify(obj)}\n\n`;
}

async function collectStream(gen: AsyncGenerator<LLMStreamEvent>): Promise<LLMStreamEvent[]> {
    const events: LLMStreamEvent[] = [];
    for await (const e of gen) events.push(e);
    return events;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('OpenAICompatibleProvider', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.LLM_MODEL;
    });

    // ── Properties ────────────────────────────────────────────────────

    describe('properties', () => {
        it('defaultModel returns the configured catalog default', () => {
            expect(new TestProvider('key').defaultModel).toBe('model-a');
        });

        it('LLM_MODEL env var overrides the catalog default', () => {
            process.env.LLM_MODEL = 'model-b';
            expect(new TestProvider('key').defaultModel).toBe('model-b');
        });

        it('providerName returns the configured name', () => {
            expect(new TestProvider('key').providerName).toBe('testprovider');
        });
    });

    // ── generate() ───────────────────────────────────────────────────

    describe('generate()', () => {
        it('calls the correct /v1/chat/completions endpoint', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            await new TestProvider('key').generate({ messages: [] });
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.example/v1/chat/completions',
                expect.anything(),
            );
        });

        it('sends method POST', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            await new TestProvider('key').generate({ messages: [] });
            expect(mockFetch.mock.calls[0][1].method).toBe('POST');
        });

        it('sends Authorization Bearer token from apiKey', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            await new TestProvider('my-secret-key').generate({ messages: [] });
            expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBe('Bearer my-secret-key');
        });

        it('uses request.model when provided', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            await new TestProvider('key').generate({ messages: [], model: 'model-b' });
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.model).toBe('model-b');
        });

        it('falls back to defaultModel when request.model is absent', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            await new TestProvider('key').generate({ messages: [] });
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.model).toBe('model-a');
        });

        it('forwards temperature and maxTokens', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            await new TestProvider('key').generate({ messages: [], temperature: 0.9, maxTokens: 512 });
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.temperature).toBe(0.9);
            expect(body.max_tokens).toBe(512);
        });

        it('defaults temperature=0.5 and max_tokens=1024', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            await new TestProvider('key').generate({ messages: [] });
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.temperature).toBe(0.5);
            expect(body.max_tokens).toBe(1024);
        });

        it('merges extraHeaders into request headers', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            await new TestProvider('key', { 'HTTP-Referer': 'https://myapp.com' }).generate({ messages: [] });
            expect(mockFetch.mock.calls[0][1].headers['HTTP-Referer']).toBe('https://myapp.com');
        });

        it('maps response content, model, provider, and usage', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            const result = await new TestProvider('key').generate({ messages: [] });
            expect(result.content).toBe('hello world');
            expect(result.model).toBe('model-a-resolved');
            expect(result.provider).toBe('testprovider');
            expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 20, totalTokens: 30 });
        });

        it('uses request model as fallback when response.model is absent', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse({ choices: [{ message: { content: 'hi' } }], usage: {} }));
            const result = await new TestProvider('key').generate({ messages: [], model: 'model-b' });
            expect(result.model).toBe('model-b');
        });

        it('returns empty content when choices is missing', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse({ model: 'model-a', usage: {} }));
            const result = await new TestProvider('key').generate({ messages: [] });
            expect(result.content).toBe('');
        });

        it('throws with provider name and status on non-ok response', async () => {
            mockFetch.mockResolvedValue(makeErrorResponse(429, 'rate limited'));
            await expect(new TestProvider('key').generate({ messages: [] })).rejects.toThrow(
                '[testprovider] API error 429: rate limited',
            );
        });

        it('throws on 500 error with body in the message', async () => {
            mockFetch.mockResolvedValue(makeErrorResponse(500, 'internal error'));
            await expect(new TestProvider('key').generate({ messages: [] })).rejects.toThrow(
                '[testprovider] API error 500: internal error',
            );
        });

        it('latencyMs is a non-negative number', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            const result = await new TestProvider('key').generate({ messages: [] });
            expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        });
    });

    // ── generateStream() ─────────────────────────────────────────────

    describe('generateStream()', () => {
        it('calls the correct endpoint', async () => {
            mockFetch.mockResolvedValue(makeStreamResponse([sseData({ choices: [{ delta: { content: 'hi' } }] })]));
            await collectStream(new TestProvider('key').generateStream({ messages: [] }));
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.example/v1/chat/completions',
                expect.anything(),
            );
        });

        it('sends stream: true in request body', async () => {
            mockFetch.mockResolvedValue(makeStreamResponse([sseData({ choices: [{ delta: { content: 'hi' } }] })]));
            await collectStream(new TestProvider('key').generateStream({ messages: [] }));
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.stream).toBe(true);
        });

        it('does NOT send stream: true in generate()', async () => {
            mockFetch.mockResolvedValue(makeJsonResponse(MOCK_JSON_RESPONSE));
            await new TestProvider('key').generate({ messages: [] });
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.stream).toBeUndefined();
        });

        it('includes extraHeaders in stream request', async () => {
            mockFetch.mockResolvedValue(makeStreamResponse([sseData({ choices: [{ delta: { content: 'x' } }] })]));
            await collectStream(new TestProvider('key', { 'X-Custom': 'value' }).generateStream({ messages: [] }));
            expect(mockFetch.mock.calls[0][1].headers['X-Custom']).toBe('value');
        });

        it('throws with provider name and status on non-ok response', async () => {
            mockFetch.mockResolvedValue(makeErrorStreamResponse(503, 'unavailable'));
            await expect(
                collectStream(new TestProvider('key').generateStream({ messages: [] }))
            ).rejects.toThrow('[testprovider] API error 503: unavailable');
        });

        it('yields text deltas from SSE response', async () => {
            const chunk =
                sseData({ choices: [{ delta: { content: 'hello' } }] }) +
                sseData({ choices: [{ delta: { content: ' world' } }] });
            mockFetch.mockResolvedValue(makeStreamResponse([chunk]));
            const events = await collectStream(new TestProvider('key').generateStream({ messages: [] }));
            const deltas = events.filter((e) => !e.done).map((e) => e.delta);
            expect(deltas).toEqual(['hello', ' world']);
        });

        it('final event has done=true with assembled content', async () => {
            const chunk =
                sseData({ choices: [{ delta: { content: 'foo' } }] }) +
                sseData({ choices: [{ delta: { content: 'bar' } }] });
            mockFetch.mockResolvedValue(makeStreamResponse([chunk]));
            const events = await collectStream(new TestProvider('key').generateStream({ messages: [] }));
            const doneEvent = events.find((e) => e.done);
            expect(doneEvent?.response?.content).toBe('foobar');
            expect(doneEvent?.response?.provider).toBe('testprovider');
        });
    });

    // ── Catalog methods ───────────────────────────────────────────────

    describe('listModels()', () => {
        it('returns model IDs from the catalog', async () => {
            expect(await new TestProvider('key').listModels()).toEqual(['model-a', 'model-b']);
        });
    });

    describe('listModelCatalog()', () => {
        it('returns the full catalog array', () => {
            expect(new TestProvider('key').listModelCatalog()).toStrictEqual(TEST_CATALOG);
        });
    });
});
