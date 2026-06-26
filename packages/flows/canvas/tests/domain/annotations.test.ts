import { describe, it, expect } from 'vitest';
import { expandAnnotations, type RawAnnotation } from '../../src/domain/annotations';

// ── Fixtures ──────────────────────────────────────────────────────────

function makeMeaning(overrides: Partial<RawAnnotation> = {}): RawAnnotation {
    return {
        tokenIds: ['t_001', 't_002'],
        layerId: 'meaning',
        label: 'Metaphor',
        detail: 'The river is time.',
        ...overrides,
    };
}

// ── expandAnnotations (pure domain transform) ─────────────────────────

describe('expandAnnotations', () => {
    it('fans a meaning annotation with tokenIds into one annotation per token', () => {
        const result = expandAnnotations([makeMeaning({ tokenIds: ['t_001', 't_002', 't_003'] })]);

        expect(result).toHaveLength(3);
        expect(result.map(a => a.tokenId)).toEqual(['t_001', 't_002', 't_003']);
        for (const ann of result) {
            expect(ann.layerId).toBe('meaning');
            expect(ann.label).toBe('Metaphor');
            expect(ann.detail).toBe('The river is time.');
        }
    });

    it('strips the array form from each expanded meaning annotation', () => {
        const result = expandAnnotations([makeMeaning({ tokenIds: ['t_001'] })]);

        for (const ann of result as Array<Record<string, unknown>>) {
            expect(ann.tokenIds).toBeUndefined();
        }
    });

    it('uses the single tokenId fallback when tokenIds is absent', () => {
        const result = expandAnnotations([makeMeaning({ tokenIds: undefined, tokenId: 't_002' })]);

        expect(result).toHaveLength(1);
        expect(result[0].tokenId).toBe('t_002');
    });

    it('drops a meaning annotation with neither tokenIds nor tokenId', () => {
        const result = expandAnnotations([makeMeaning({ tokenIds: undefined })]);

        expect(result).toHaveLength(0);
    });

    it('passes through a non-meaning annotation unchanged, keeping tokenIds', () => {
        const passthrough: RawAnnotation = {
            tokenId: 't_003',
            tokenIds: ['t_003'],
            layerId: 'chords',
            label: 'Am',
            detail: 'A minor chord.',
        };

        const result = expandAnnotations([passthrough]);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(passthrough);
        expect((result[0] as Record<string, unknown>).tokenIds).toEqual(['t_003']);
    });

    it('handles a mix of expanded meaning and passthrough annotations', () => {
        const result = expandAnnotations([
            makeMeaning({ tokenIds: ['t_001', 't_002'] }),
            { tokenId: 't_003', layerId: 'chords', label: 'Am', detail: 'A minor chord.' },
        ]);

        expect(result).toHaveLength(3);
        const meaningTokens = result.filter(a => a.layerId === 'meaning').map(a => a.tokenId);
        expect(meaningTokens).toEqual(['t_001', 't_002']);
        expect(result.some(a => a.layerId === 'chords' && a.tokenId === 't_003')).toBe(true);
    });

    it('returns an empty array for empty input', () => {
        expect(expandAnnotations([])).toEqual([]);
    });
});
