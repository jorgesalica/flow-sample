import { describe, expect, it } from 'vitest';
import type { CanvasAnalysis } from '@flows/shared';
import { parseCanvasAnalysis, parseCanvasAnalysisList } from './contract';

function makeCanvas(overrides: Partial<CanvasAnalysis> = {}): CanvasAnalysis {
  return {
    id: 'analysis_1',
    sourceId: 'source_1',
    sourceType: 'user_text',
    sourceTextHash: 'hash_1',
    tokenAst: {
      sections: [
        { id: 'section_1', type: 'Paragraph', lines: [[{ id: 'token_1', text: 'Hello' }]] },
      ],
      totalTokens: 1,
    },
    annotations: [{ tokenId: 'token_1', layerId: 'meaning', label: 'Theme', detail: 'A detail' }],
    layers: [{ id: 'meaning', name: 'Meaning', icon: 'M', color: '#ffffff' }],
    meta: { title: 'Canvas' },
    modelUsed: 'fake-model',
    providerUsed: 'fake-provider',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('canvas response contract', () => {
  it('accepts complete analyses and lists', () => {
    const canvas = makeCanvas();

    expect(parseCanvasAnalysis(canvas)).toBe(canvas);
    expect(parseCanvasAnalysisList([canvas])).toEqual([canvas]);
  });

  it.each([
    ['source type', { sourceType: 'unknown' }],
    ['token count', { tokenAst: { sections: [], totalTokens: -1 } }],
    ['annotation', { annotations: [{ tokenId: 'token_1' }] }],
    ['metadata', { meta: [] }],
  ])('rejects an invalid %s', (_label, override) => {
    expect(() => parseCanvasAnalysis({ ...makeCanvas(), ...override })).toThrow(
      'Invalid canvas response'
    );
  });

  it('rejects a list when one item is malformed', () => {
    expect(() => parseCanvasAnalysisList([makeCanvas(), { id: 'partial' }])).toThrow(
      'Invalid canvas list response'
    );
  });
});
