import type { Section, TokenAST } from '@flows/shared';

const SECTION_MARKERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\[?(verse|estrofa)/i, 'Verse'],
  [/^\[?(chorus|coro|estribillo)/i, 'Chorus'],
  [/^\[?(bridge|puente)/i, 'Bridge'],
  [/^\[?pre[- ]?chorus/i, 'Pre-Chorus'],
  [/^\[?(outro|final)/i, 'Outro'],
  [/^\[?intro/i, 'Intro'],
];

/** Apply lyrics-specific section names without changing tokens or IDs. */
export function classifyLyricsSections(ast: TokenAST): TokenAST {
  return {
    ...ast,
    sections: ast.sections.map((section, index) => ({
      ...section,
      type: inferLyricsSectionType(section, index),
    })),
  };
}

function inferLyricsSectionType(section: Section, index: number): string {
  const firstLine = section.lines[0]?.map((token) => token.text).join(' ').trim() ?? '';
  const match = SECTION_MARKERS.find(([pattern]) => pattern.test(firstLine));

  return match?.[1] ?? (index === 0 ? 'Verse' : 'Section');
}
