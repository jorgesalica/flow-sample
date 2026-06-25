import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGenerateContent } = vi.hoisted(() => ({
    mockGenerateContent: vi.fn(),
}));

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn(function (this: any) {
        this.models = { generateContent: mockGenerateContent };
    }),
}));

import { GeminiProvider } from '../../../src/llm/providers/gemini/gemini-provider';

const okGenAIResponse = {
    text: 'response text',
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
};

function capturedContents(): any[] {
    return mockGenerateContent.mock.calls[0][0].contents;
}

describe('GeminiProvider formatMessages', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGenerateContent.mockResolvedValue(okGenAIResponse);
        provider = new GeminiProvider('test-api-key');
    });

    it('maps a plain user message to role=user', async () => {
        await provider.generate({ messages: [{ role: 'user', content: 'hello' }] });
        expect(capturedContents()).toEqual([{ role: 'user', parts: [{ text: 'hello' }] }]);
    });

    it('prepends system prompt to the first user message', async () => {
        await provider.generate({
            messages: [
                { role: 'system', content: 'You are helpful.' },
                { role: 'user', content: 'hi' },
            ],
        });
        const contents = capturedContents();
        expect(contents).toHaveLength(1);
        expect(contents[0].role).toBe('user');
        expect(contents[0].parts[0].text).toBe('You are helpful.\n\nhi');
    });

    it('concatenates multiple system messages before the first user message', async () => {
        await provider.generate({
            messages: [
                { role: 'system', content: 'Part A.' },
                { role: 'system', content: 'Part B.' },
                { role: 'user', content: 'question' },
            ],
        });
        expect(capturedContents()[0].parts[0].text).toBe('Part A.\n\nPart B.\n\nquestion');
    });

    it('maps assistant role to model', async () => {
        await provider.generate({
            messages: [
                { role: 'user', content: 'hello' },
                { role: 'assistant', content: 'hi there' },
            ],
        });
        const contents = capturedContents();
        expect(contents[1].role).toBe('model');
        expect(contents[1].parts[0].text).toBe('hi there');
    });

    it('only prepends system prompt once — not to subsequent user messages', async () => {
        await provider.generate({
            messages: [
                { role: 'system', content: 'System.' },
                { role: 'user', content: 'first' },
                { role: 'user', content: 'second' },
            ],
        });
        const contents = capturedContents();
        expect(contents[0].parts[0].text).toBe('System.\n\nfirst');
        expect(contents[1].parts[0].text).toBe('second');
    });

    it('returns correct content and usage from generate()', async () => {
        const result = await provider.generate({ messages: [{ role: 'user', content: 'q' }] });
        expect(result.content).toBe('response text');
        expect(result.provider).toBe('gemini');
        expect(result.usage.inputTokens).toBe(10);
        expect(result.usage.outputTokens).toBe(5);
    });
});
