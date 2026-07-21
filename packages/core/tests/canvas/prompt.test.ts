import { describe, expect, it } from 'vitest';
import type { Annotation, TokenAST } from '@flows/shared';
import { filterAnnotationsForAst, formatTokenAstForPrompt } from '../../src/canvas/prompt';

const ast: TokenAST = {
    totalTokens: 4,
    sections: [
        {
            id: 's_001',
            type: 'Verse',
            lines: [
                [
                    { id: 't_001', text: 'first' },
                    { id: 't_002', text: 'line' },
                ],
                [{ id: 't_003', text: 'second' }],
            ],
        },
        {
            id: 's_002',
            type: 'Chorus',
            lines: [[{ id: 't_004', text: 'ending' }]],
        },
    ],
};

describe('formatTokenAstForPrompt', () => {
    it('preserves line and section boundaries using only token IDs', () => {
        expect(formatTokenAstForPrompt(ast)).toBe(
            'first[t_001] line[t_002]\nsecond[t_003]\n\nending[t_004]',
        );
    });

    it('does not expose section labels or structural IDs', () => {
        const promptText = formatTokenAstForPrompt(ast);

        expect(promptText).not.toContain('Verse');
        expect(promptText).not.toContain('Chorus');
        expect(promptText).not.toContain('s_001');
    });
});

describe('filterAnnotationsForAst', () => {
    const annotation = (tokenId: string): Annotation => ({
        tokenId,
        layerId: 'meaning',
        label: 'Theme',
        detail: 'Detail',
    });

    it('removes annotations whose token IDs are absent from the AST', () => {
        expect(
            filterAnnotationsForAst(ast, [annotation('t_001'), annotation('t_999')]),
        ).toEqual([annotation('t_001')]);
    });

    it('does not mutate the input annotations', () => {
        const annotations = [annotation('t_001'), annotation('t_999')];

        filterAnnotationsForAst(ast, annotations);

        expect(annotations).toHaveLength(2);
    });
});
