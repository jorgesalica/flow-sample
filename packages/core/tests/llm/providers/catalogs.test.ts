import { describe, it, expect } from 'vitest';
import { GEMINI_MODELS, GEMINI_DEFAULT_MODEL } from '../../../src/llm/providers/gemini/models';
import { GROQ_MODELS, GROQ_DEFAULT_MODEL } from '../../../src/llm/providers/groq/models';
import {
  OPENROUTER_MODELS,
  OPENROUTER_DEFAULT_MODEL,
} from '../../../src/llm/providers/openrouter/models';
import {
  CEREBRAS_MODELS,
  CEREBRAS_DEFAULT_MODEL,
} from '../../../src/llm/providers/cerebras/models';
import { MISTRAL_MODELS, MISTRAL_DEFAULT_MODEL } from '../../../src/llm/providers/mistral/models';
import type { ModelInfo, ModelTier, ModelPricing } from '../../../src/llm/types';

const VALID_TIERS: ModelTier[] = ['very_high', 'high', 'medium', 'low'];
const VALID_PRICINGS: ModelPricing[] = ['free', 'paid'];

const catalogs: { name: string; models: ModelInfo[]; defaultModel: string }[] = [
  { name: 'gemini', models: GEMINI_MODELS, defaultModel: GEMINI_DEFAULT_MODEL },
  { name: 'groq', models: GROQ_MODELS, defaultModel: GROQ_DEFAULT_MODEL },
  { name: 'openrouter', models: OPENROUTER_MODELS, defaultModel: OPENROUTER_DEFAULT_MODEL },
  { name: 'cerebras', models: CEREBRAS_MODELS, defaultModel: CEREBRAS_DEFAULT_MODEL },
  { name: 'mistral', models: MISTRAL_MODELS, defaultModel: MISTRAL_DEFAULT_MODEL },
];

describe.each(catalogs)('$name model catalog', ({ models, defaultModel }) => {
  it('is non-empty', () => {
    expect(models.length).toBeGreaterThan(0);
  });

  it('has no duplicate model IDs', () => {
    const ids = models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('default model exists in the catalog', () => {
    expect(models.some((m) => m.id === defaultModel)).toBe(true);
  });

  it('every id and name are non-empty strings', () => {
    for (const m of models) {
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);
      expect(typeof m.name).toBe('string');
      expect(m.name.length).toBeGreaterThan(0);
    }
  });

  it('every contextWindow is a positive integer >= 1000', () => {
    for (const m of models) {
      expect(Number.isInteger(m.contextWindow)).toBe(true);
      expect(m.contextWindow).toBeGreaterThanOrEqual(1000);
    }
  });

  it('every tier is a valid ModelTier', () => {
    for (const m of models) {
      expect(VALID_TIERS).toContain(m.tier);
    }
  });

  it('every pricing is a valid ModelPricing', () => {
    for (const m of models) {
      expect(VALID_PRICINGS).toContain(m.pricing);
    }
  });
});
