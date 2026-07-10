import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LLMRequest } from '../../../src/llm/types';

const { mockGenerateContent } = vi.hoisted(() => ({
    mockGenerateContent: vi.fn(),
}));

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn(function (this: { models: { generateContent: typeof mockGenerateContent } }) {
        this.models = { generateContent: mockGenerateContent };
    }),
}));

import { GeminiProvider } from '../../../src/llm/providers/gemini/gemini-provider';
import { GEMINI_DEFAULT_MODEL } from '../../../src/llm/providers/gemini/models';

const okGenAIResponse = {
    text: 'mapped text',
    usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 8, totalTokenCount: 20 },
};

function capturedCall(): { model: string; contents: unknown[]; config: Record<string, unknown> } {
    return mockGenerateContent.mock.calls[0][0];
}

describe('GeminiProvider.generate — response mapping', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGenerateContent.mockResolvedValue(okGenAIResponse);
        provider = new GeminiProvider('test-api-key');
    });

    it('maps the SDK response to an LLMResponse', async () => {
        const result = await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });

        expect(result.content).toBe('mapped text');
        expect(result.provider).toBe('gemini');
        expect(result.model).toBe(GEMINI_DEFAULT_MODEL);
        expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 8, totalTokens: 20 });
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('defaults content to empty string when the SDK returns no text', async () => {
        mockGenerateContent.mockResolvedValueOnce({ usageMetadata: {} });
        const result = await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
        expect(result.content).toBe('');
    });

    it('defaults usage to zeros when usageMetadata is absent', async () => {
        mockGenerateContent.mockResolvedValueOnce({ text: 'no usage' });
        const result = await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
        expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    });

    it('uses the default model when no model override is given', async () => {
        await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
        expect(capturedCall().model).toBe(GEMINI_DEFAULT_MODEL);
    });

    it('honours a per-request model override', async () => {
        await provider.generate({ messages: [{ role: 'user', content: 'hi' }], model: 'gemini-custom' });
        expect(capturedCall().model).toBe('gemini-custom');
    });

    it('applies default temperature and maxOutputTokens', async () => {
        await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
        const { config } = capturedCall();
        expect(config.temperature).toBe(0.5);
        expect(config.maxOutputTokens).toBe(1024);
    });

    it('passes through request temperature and maxTokens', async () => {
        await provider.generate({
            messages: [{ role: 'user', content: 'hi' }],
            temperature: 0.2,
            maxTokens: 256,
        });
        const { config } = capturedCall();
        expect(config.temperature).toBe(0.2);
        expect(config.maxOutputTokens).toBe(256);
    });

    it('maps structuredOutput to Gemini responseJsonSchema config', async () => {
        const jsonSchema = { type: 'object', properties: { x: { type: 'string' } } };
        const request: LLMRequest = {
            messages: [{ role: 'user', content: 'hi' }],
            structuredOutput: { jsonSchema, mimeType: 'application/json' },
        };
        await provider.generate(request);

        const { config } = capturedCall();
        expect(config.responseMimeType).toBe('application/json');
        expect(config.responseJsonSchema).toEqual(jsonSchema);
    });

    it('defaults structuredOutput mime type to application/json when omitted', async () => {
        await provider.generate({
            messages: [{ role: 'user', content: 'hi' }],
            structuredOutput: { jsonSchema: { type: 'object' } },
        });
        expect(capturedCall().config.responseMimeType).toBe('application/json');
    });

    it('omits structured output config when not requested', async () => {
        await provider.generate({ messages: [{ role: 'user', content: 'hi' }] });
        const { config } = capturedCall();
        expect(config.responseJsonSchema).toBeUndefined();
        expect(config.responseMimeType).toBeUndefined();
    });

    it('propagates errors thrown by the SDK', async () => {
        mockGenerateContent.mockRejectedValueOnce(new Error('genai boom'));
        await expect(
            provider.generate({ messages: [{ role: 'user', content: 'hi' }] }),
        ).rejects.toThrow('genai boom');
    });
});

describe('GeminiProvider metadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('reports providerName as gemini', () => {
        expect(new GeminiProvider('k').providerName).toBe('gemini');
    });

    it('defaults the model to the gemini default', () => {
        expect(new GeminiProvider('k').defaultModel).toBe(GEMINI_DEFAULT_MODEL);
    });

    it('respects an injected default model', () => {
        expect(new GeminiProvider('k', 'gemini-configured').defaultModel).toBe('gemini-configured');
    });

    it('returns the static model catalog', () => {
        const catalog = new GeminiProvider('k').listModelCatalog();
        expect(catalog.length).toBeGreaterThan(0);
        expect(catalog[0]).toHaveProperty('id');
    });
});
