import { describe, it, expect } from 'vitest';
import { GEMINI_MODELS } from '../../../src/llm/providers/gemini/models';
import { GROQ_MODELS } from '../../../src/llm/providers/groq/models';
import { OPENROUTER_MODELS } from '../../../src/llm/providers/openrouter/models';
import { CEREBRAS_MODELS } from '../../../src/llm/providers/cerebras/models';
import { MISTRAL_MODELS } from '../../../src/llm/providers/mistral/models';
import type { ModelInfo, ModelTier, ModelPricing } from '../../../src/llm/providers/types';

const VALID_TIERS: ModelTier[] = ['very_high', 'high', 'medium', 'low'];
const VALID_PRICINGS: ModelPricing[] = ['free', 'paid'];

const catalogs: { name: string; models: ModelInfo[] }[] = [
    { name: 'gemini', models: GEMINI_MODELS },
    { name: 'groq', models: GROQ_MODELS },
    { name: 'openrouter', models: OPENROUTER_MODELS },
    { name: 'cerebras', models: CEREBRAS_MODELS },
    { name: 'mistral', models: MISTRAL_MODELS },
];

describe.each(catalogs)('$name model catalog', ({ models }) => {
    it('is non-empty', () => {
        expect(models.length).toBeGreaterThan(0);
    });

    it('every entry has required string/number fields', () => {
        for (const m of models) {
            expect(typeof m.id).toBe('string');
            expect(m.id.length).toBeGreaterThan(0);
            expect(typeof m.name).toBe('string');
            expect(m.name.length).toBeGreaterThan(0);
            expect(typeof m.contextWindow).toBe('number');
            expect(m.contextWindow).toBeGreaterThan(0);
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
