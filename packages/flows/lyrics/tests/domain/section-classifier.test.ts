import { describe, expect, it } from 'vitest';
import type { TokenAST } from '@flows/shared';
import { classifyLyricsSections } from '../../src/domain/section-classifier';

function astWithSections(...lines: string[]): TokenAST {
  let tokenCounter = 0;

  return {
    totalTokens: lines.length,
    sections: lines.map((line, index) => {
      tokenCounter += 1;
      return {
        id: `s_${String(index + 1).padStart(3, '0')}`,
        type: `Section ${index + 1}`,
        lines: [[{ id: `t_${String(tokenCounter).padStart(3, '0')}`, text: line }]],
      };
    }),
  };
}

describe('classifyLyricsSections', () => {
  it.each([
    ['Verse 1', 'Verse'],
    ['Estrofa 2', 'Verse'],
    ['[Chorus]', 'Chorus'],
    ['Coro', 'Chorus'],
    ['Estribillo', 'Chorus'],
    ['Bridge', 'Bridge'],
    ['Puente', 'Bridge'],
    ['Pre-Chorus', 'Pre-Chorus'],
    ['Outro', 'Outro'],
    ['Final', 'Outro'],
    ['Intro', 'Intro'],
  ])('classifies %s as %s', (marker, expected) => {
    expect(classifyLyricsSections(astWithSections(marker)).sections[0].type).toBe(expected);
  });

  it('preserves the legacy defaults for unmarked lyrics sections', () => {
    const classified = classifyLyricsSections(astWithSections('first words', 'more words'));

    expect(classified.sections.map((section) => section.type)).toEqual(['Verse', 'Section']);
  });

  it('does not mutate the generic AST or its token IDs', () => {
    const genericAst = astWithSections('[Chorus]');
    const classified = classifyLyricsSections(genericAst);

    expect(genericAst.sections[0].type).toBe('Section 1');
    expect(classified.sections[0].lines).toBe(genericAst.sections[0].lines);
    expect(classified.sections[0].lines[0][0].id).toBe('t_001');
  });
});
