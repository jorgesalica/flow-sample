import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { LLMClient } from '../../src/llm/client';
import type { LLMRequest, LLMResponse } from '../../src/llm/types';

// ── Helpers ───────────────────────────────────────────────────────────

function makeResponse(content: string): LLMResponse {
    return {
        content,
        model: 'test-model',
        provider: 'test',
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        latencyMs: 1,
    };
}

/**
 * Build an LLMClient whose `generate` is stubbed to return the queued responses
 * in order. Exercises the real generateObject() (zod parse, fence stripping,
 * retry-once) while mocking the provider edge.
 */
function makeClientReturning(...contents: string[]) {
    const client = Object.create(LLMClient.prototype) as LLMClient;
    const generate = vi.fn<[LLMRequest], Promise<LLMResponse>>();
    for (const content of contents) {
        generate.mockResolvedValueOnce(makeResponse(content));
    }
    // generateObject calls this.generate(...)
    (client as unknown as { generate: typeof generate }).generate = generate;
    return { client, generate };
}

const schema = z.object({ sentiment: z.string(), score: z.number() });

// ── Tests ─────────────────────────────────────────────────────────────

describe('LLMClient.generateObject', () => {
    const req: LLMRequest = { messages: [{ role: 'user', content: 'analyze' }] };

    it('parses and validates plain JSON content on the first try', async () => {
        const { client, generate } = makeClientReturning(
            JSON.stringify({ sentiment: 'happy', score: 0.9 }),
        );

        const result = await client.generateObject(req, schema);

        expect(result).toEqual({ sentiment: 'happy', score: 0.9 });
        expect(generate).toHaveBeenCalledOnce();
    });

    it('returns the provider response alongside a validated object when requested', async () => {
        const { client } = makeClientReturning(
            JSON.stringify({ sentiment: 'focused', score: 0.8 }),
        );

        const result = await client.generateObjectWithMetadata(req, schema);

        expect(result.value).toEqual({ sentiment: 'focused', score: 0.8 });
        expect(result.response).toMatchObject({ provider: 'test', model: 'test-model' });
    });

    it('passes the JSON schema as structured output to generate', async () => {
        const { client, generate } = makeClientReturning(
            JSON.stringify({ sentiment: 'sad', score: 0.1 }),
        );

        await client.generateObject(req, schema);

        const sentRequest = generate.mock.calls[0][0];
        expect(sentRequest.structuredOutput).toBeDefined();
        expect(sentRequest.structuredOutput!.mimeType).toBe('application/json');
        expect(sentRequest.structuredOutput!.jsonSchema).toBeTypeOf('object');
    });

    it('strips ```json fences before parsing', async () => {
        const fenced = '```json\n{"sentiment":"calm","score":0.5}\n```';
        const { client } = makeClientReturning(fenced);

        const result = await client.generateObject(req, schema);
        expect(result).toEqual({ sentiment: 'calm', score: 0.5 });
    });

    it('strips bare ``` fences before parsing', async () => {
        const fenced = '```\n{"sentiment":"neutral","score":0}\n```';
        const { client } = makeClientReturning(fenced);

        const result = await client.generateObject(req, schema);
        expect(result).toEqual({ sentiment: 'neutral', score: 0 });
    });

    it('retries once and succeeds when the first response is invalid JSON', async () => {
        const { client, generate } = makeClientReturning(
            'this is not json at all',
            JSON.stringify({ sentiment: 'recovered', score: 1 }),
        );

        const result = await client.generateObject(req, schema);

        expect(result).toEqual({ sentiment: 'recovered', score: 1 });
        expect(generate).toHaveBeenCalledTimes(2);
    });

    it('retries once when the first response fails zod validation (wrong types)', async () => {
        const { client, generate } = makeClientReturning(
            JSON.stringify({ sentiment: 'happy', score: 'not-a-number' }),
            JSON.stringify({ sentiment: 'happy', score: 0.7 }),
        );

        const result = await client.generateObject(req, schema);

        expect(result).toEqual({ sentiment: 'happy', score: 0.7 });
        expect(generate).toHaveBeenCalledTimes(2);
    });

    it('includes a corrective conversation turn on the retry request', async () => {
        const { client, generate } = makeClientReturning(
            'broken',
            JSON.stringify({ sentiment: 'ok', score: 1 }),
        );

        await client.generateObject(req, schema);

        const retryRequest = generate.mock.calls[1][0];
        const roles = retryRequest.messages.map((m) => m.role);
        expect(roles).toContain('assistant');
        const lastMessage = retryRequest.messages[retryRequest.messages.length - 1];
        expect(lastMessage.role).toBe('user');
        expect(lastMessage.content).toMatch(/did not match the required JSON schema/);
    });

    it('throws when the retry also returns invalid output (no third attempt)', async () => {
        const { client, generate } = makeClientReturning(
            'still broken',
            'broken again',
        );

        await expect(client.generateObject(req, schema)).rejects.toThrow();
        expect(generate).toHaveBeenCalledTimes(2);
    });
});
