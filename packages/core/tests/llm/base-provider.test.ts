import { describe, expect, it } from 'vitest';
import { BaseLLMProvider } from '../../src/llm/providers/base-provider';
import type { LLMRequest, LLMResponse, ModelInfo } from '../../src/llm/types';

class TestProvider extends BaseLLMProvider {
    get defaultModel(): string {
        return 'test-model';
    }

    get providerName(): string {
        return 'test-provider';
    }

    async generate(_request: LLMRequest): Promise<LLMResponse> {
        return {
            content: 'complete response',
            model: this.defaultModel,
            provider: this.providerName,
            usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
            latencyMs: 4,
        };
    }

    async listModels(): Promise<string[]> {
        return [this.defaultModel];
    }

    listModelCatalog(): ModelInfo[] {
        return [];
    }
}

describe('BaseLLMProvider', () => {
    it('falls back to a complete response when streaming is not specialized', async () => {
        const provider = new TestProvider('test-key');
        const events = [];

        for await (const event of provider.generateStream({
            messages: [{ role: 'user', content: 'hello' }],
        })) {
            events.push(event);
        }

        expect(events).toEqual([
            { delta: 'complete response', done: false },
            {
                delta: '',
                done: true,
                response: {
                    content: 'complete response',
                    model: 'test-model',
                    provider: 'test-provider',
                    usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
                    latencyMs: 4,
                },
            },
        ]);
    });
});
