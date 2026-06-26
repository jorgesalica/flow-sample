import { describe, it, expect } from 'vitest';
import {
    chordAnnotationSchema,
    vocalAnnotationSchema,
    productionAnnotationSchema,
    meaningAnnotationSchema,
    musicAnnotationSchema,
    musicalAnalysisSchema,
} from '../../../src/backend/canvas/schemas';

describe('canvas schemas', () => {
    describe('chordAnnotationSchema', () => {
        it('parses a valid chord annotation', () => {
            const result = chordAnnotationSchema.parse({
                tokenId: 't_005',
                layerId: 'chords',
                label: 'Am',
                detail: 'Sets a melancholic tone',
                symbol: 'Am',
            });
            expect(result.layerId).toBe('chords');
            expect(result.symbol).toBe('Am');
        });

        it('rejects when layerId is not the chords literal', () => {
            const parsed = chordAnnotationSchema.safeParse({
                tokenId: 't_005',
                layerId: 'vocal',
                label: 'Am',
                detail: 'x',
                symbol: 'Am',
            });
            expect(parsed.success).toBe(false);
        });

        it('rejects when the required symbol field is missing', () => {
            const parsed = chordAnnotationSchema.safeParse({
                tokenId: 't_005',
                layerId: 'chords',
                label: 'Am',
                detail: 'x',
            });
            expect(parsed.success).toBe(false);
        });
    });

    describe('vocalAnnotationSchema', () => {
        it('parses a valid vocal annotation', () => {
            const result = vocalAnnotationSchema.parse({
                tokenId: 't_012',
                layerId: 'vocal',
                label: 'Falsetto',
                detail: 'Breathy voice to convey vulnerability',
                technique: 'Falsetto',
            });
            expect(result.technique).toBe('Falsetto');
        });

        it('rejects when the technique field is missing', () => {
            const parsed = vocalAnnotationSchema.safeParse({
                tokenId: 't_012',
                layerId: 'vocal',
                label: 'Falsetto',
                detail: 'x',
            });
            expect(parsed.success).toBe(false);
        });
    });

    describe('productionAnnotationSchema', () => {
        it('parses a valid production annotation', () => {
            const result = productionAnnotationSchema.parse({
                tokenId: 't_020',
                layerId: 'production',
                label: 'Reverb',
                detail: 'Spacious hall reverb',
                effect: 'Reverb',
            });
            expect(result.effect).toBe('Reverb');
        });

        it('rejects when the effect field is missing', () => {
            const parsed = productionAnnotationSchema.safeParse({
                tokenId: 't_020',
                layerId: 'production',
                label: 'Reverb',
                detail: 'x',
            });
            expect(parsed.success).toBe(false);
        });
    });

    describe('meaningAnnotationSchema', () => {
        it('parses a meaning annotation with a tokenIds array (phrase)', () => {
            const result = meaningAnnotationSchema.parse({
                tokenIds: ['t_015', 't_016', 't_017'],
                layerId: 'meaning',
                label: 'Metaphor',
                detail: "The 'dark water' represents the singer's struggle.",
                context: 'Mental Health',
            });
            expect(result.tokenIds).toEqual(['t_015', 't_016', 't_017']);
            expect(result.tokenId).toBeUndefined();
        });

        it('parses a meaning annotation with a single fallback tokenId', () => {
            const result = meaningAnnotationSchema.parse({
                tokenId: 't_015',
                layerId: 'meaning',
                label: 'Reference',
                detail: 'A nod to a cultural icon.',
                context: 'Culture',
            });
            expect(result.tokenId).toBe('t_015');
            expect(result.tokenIds).toBeUndefined();
        });

        it('rejects when context (required theme) is missing', () => {
            const parsed = meaningAnnotationSchema.safeParse({
                tokenIds: ['t_015'],
                layerId: 'meaning',
                label: 'Metaphor',
                detail: 'x',
            });
            expect(parsed.success).toBe(false);
        });
    });

    describe('musicAnnotationSchema (discriminated union)', () => {
        it('discriminates a chord annotation by layerId', () => {
            const result = musicAnnotationSchema.parse({
                tokenId: 't_001',
                layerId: 'chords',
                label: 'G',
                detail: 'Resolves the phrase',
                symbol: 'G',
            });
            expect(result.layerId).toBe('chords');
        });

        it('discriminates a meaning annotation by layerId', () => {
            const result = musicAnnotationSchema.parse({
                tokenIds: ['t_001', 't_002'],
                layerId: 'meaning',
                label: 'Theme',
                detail: 'Longing',
                context: 'Love',
            });
            expect(result.layerId).toBe('meaning');
        });

        it('rejects an unknown layerId not in the union', () => {
            const parsed = musicAnnotationSchema.safeParse({
                tokenId: 't_001',
                layerId: 'unknown_layer',
                label: 'X',
                detail: 'x',
            });
            expect(parsed.success).toBe(false);
        });
    });

    describe('musicalAnalysisSchema', () => {
        it('parses a full analysis result with annotations and meta', () => {
            const result = musicalAnalysisSchema.parse({
                annotations: [
                    {
                        tokenId: 't_005',
                        layerId: 'chords',
                        label: 'Am',
                        detail: 'Melancholic',
                        symbol: 'Am',
                    },
                    {
                        tokenIds: ['t_015', 't_016'],
                        layerId: 'meaning',
                        label: 'Metaphor',
                        detail: 'Deeper meaning',
                        context: 'Mental Health',
                    },
                ],
                meta: { key: 'A minor', bpm: 120, mood: 'Melancholic' },
            });
            expect(result.annotations).toHaveLength(2);
            expect(result.meta.key).toBe('A minor');
            expect(result.meta.bpm).toBe(120);
        });

        it('accepts nullable meta fields', () => {
            const result = musicalAnalysisSchema.parse({
                annotations: [],
                meta: { key: null, bpm: null, mood: null },
            });
            expect(result.meta.key).toBeNull();
            expect(result.meta.bpm).toBeNull();
            expect(result.meta.mood).toBeNull();
        });

        it('rejects when annotations is missing', () => {
            const parsed = musicalAnalysisSchema.safeParse({
                meta: { key: null, bpm: null, mood: null },
            });
            expect(parsed.success).toBe(false);
        });

        it('rejects when bpm is a non-numeric string', () => {
            const parsed = musicalAnalysisSchema.safeParse({
                annotations: [],
                meta: { key: 'C', bpm: 'fast', mood: 'Upbeat' },
            });
            expect(parsed.success).toBe(false);
        });

        it('rejects when an annotation inside the array is malformed', () => {
            const parsed = musicalAnalysisSchema.safeParse({
                annotations: [
                    { tokenId: 't_001', layerId: 'chords', label: 'Am', detail: 'x' },
                ],
                meta: { key: null, bpm: null, mood: null },
            });
            expect(parsed.success).toBe(false);
        });
    });
});
