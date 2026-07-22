import { describe, expect, it } from 'vitest';
import { createLLMConfigFromEnv } from '../../src/llm/env';

describe('createLLMConfigFromEnv', () => {
  it('defaults to Gemini without inventing API keys', () => {
    expect(createLLMConfigFromEnv({})).toEqual({
      provider: 'gemini',
      model: undefined,
      apiKeys: {},
    });
  });

  it('collects provider, model, and available API keys', () => {
    expect(
      createLLMConfigFromEnv({
        LLM_PROVIDER: 'rotation',
        LLM_MODEL: 'configured-model',
        GROQ_API_KEY: 'groq-key',
        OPENROUTER_API_KEY: 'openrouter-key',
      }),
    ).toEqual({
      provider: 'rotation',
      model: 'configured-model',
      apiKeys: { groq: 'groq-key', openrouter: 'openrouter-key' },
    });
  });

  it('falls back to Gemini for an unknown provider', () => {
    expect(createLLMConfigFromEnv({ LLM_PROVIDER: 'unknown' }).provider).toBe('gemini');
  });
});
