import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TokenAST } from '@flows/shared';
import type { TextAnalysisResult } from '../../src/backend/schemas';

// ── Mock the external edge: @flows/core's LLMClient + logger ──────────
//
// analyzeText() calls LLMClient.createRotation().generateObjectWithMetadata(...). We mock
// the LLM rotation (the network/SDK edge) and run the REAL expansion domain
// logic in text-analyzer.ts against a fixed structured result.

const generateObject = vi.fn();
const generateObjectWithMetadata = vi.fn(async (request: unknown, schema: unknown) => ({
  value: await generateObject(request, schema),
  response: {
    content: '{}',
    model: 'gpt-oss-120b',
    provider: 'cerebras',
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    latencyMs: 1,
  },
}));
const createRotation = vi.fn(() => ({ generateObjectWithMetadata }));

vi.mock('@flows/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@flows/core')>();
  const noopLog = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => noopLog),
  };
  return {
    ...actual,
    LLMClient: { createRotation },
    logger: { child: vi.fn(() => noopLog) },
  };
});

// Import after the mock is registered.
const { analyzeText } = await import('../../src/backend/text-analyzer');

// ── Fixtures ──────────────────────────────────────────────────────────

function makeAst(): TokenAST {
  return {
    totalTokens: 3,
    sections: [
      {
        id: 's_001',
        type: 'Verse',
        lines: [
          [
            { id: 't_001', text: 'el' },
            { id: 't_002', text: 'río' },
            { id: 't_003', text: 'corre' },
          ],
        ],
      },
    ],
  };
}

function makeResult(overrides: Partial<TextAnalysisResult> = {}): TextAnalysisResult {
  return {
    annotations: [],
    meta: { theme: 'Time', tone: 'Reflective', summary: 'A river.' },
    ...overrides,
  } as TextAnalysisResult;
}

beforeEach(() => {
  vi.clearAllMocks();
  createRotation.mockReturnValue({ generateObjectWithMetadata });
});

// ── Wiring ────────────────────────────────────────────────────────────

describe('analyzeText — LLM wiring', () => {
  it('obtains a rotation client and calls generateObject once', async () => {
    generateObject.mockResolvedValue(makeResult());

    const result = await analyzeText(makeAst());

    expect(createRotation).toHaveBeenCalledOnce();
    expect(generateObject).toHaveBeenCalledOnce();
    expect(result.providerUsed).toBe('cerebras');
    expect(result.modelUsed).toBe('gpt-oss-120b');
  });

  it('passes the analysis schema and deterministic request params to generateObject', async () => {
    generateObject.mockResolvedValue(makeResult());

    await analyzeText(makeAst());

    const [request, schema] = generateObject.mock.calls[0];
    expect(request.temperature).toBe(0.2);
    expect(request.maxTokens).toBe(4096);
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].role).toBe('user');
    expect(schema).toBeDefined();
  });

  it('embeds tokenized text without exposing structural labels or IDs', async () => {
    generateObject.mockResolvedValue(makeResult());

    await analyzeText(makeAst());

    const prompt = generateObject.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('el[t_001]');
    expect(prompt).toContain('río[t_002]');
    expect(prompt).not.toContain('[Verse]');
    expect(prompt).not.toContain('s_001');
  });

  it('uses the title/author identity in the prompt when both are provided', async () => {
    generateObject.mockResolvedValue(makeResult());

    await analyzeText(makeAst(), 'Nocturno', 'José Asunción Silva');

    const prompt = generateObject.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('"Nocturno" by José Asunción Silva');
  });

  it('falls back to a generic identity when no author is provided', async () => {
    generateObject.mockResolvedValue(makeResult());

    await analyzeText(makeAst(), 'Nocturno');

    const prompt = generateObject.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('the following text');
    expect(prompt).not.toContain('by ');
  });
});

// ── Meaning annotation expansion (the core domain logic) ──────────────

describe('analyzeText — meaning annotation expansion', () => {
  it('expands a meaning annotation with tokenIds into one annotation per token', async () => {
    generateObject.mockResolvedValue(
      makeResult({
        annotations: [
          {
            tokenIds: ['t_001', 't_002', 't_003'],
            layerId: 'meaning',
            label: 'Metaphor',
            detail: 'The river is time.',
            context: 'Mortality',
          },
        ],
      }),
    );

    const { annotations } = await analyzeText(makeAst());

    expect(annotations).toHaveLength(3);
    expect(annotations.map((a) => a.tokenId)).toEqual(['t_001', 't_002', 't_003']);
    // Every expanded annotation keeps the shared meaning metadata...
    for (const ann of annotations) {
      expect(ann.layerId).toBe('meaning');
      expect(ann.label).toBe('Metaphor');
      expect(ann.detail).toBe('The river is time.');
    }
    // ...and the array form must NOT leak into the per-token output.
    for (const ann of annotations as Array<Record<string, unknown>>) {
      expect(ann.tokenIds).toBeUndefined();
    }
  });

  it('uses the single tokenId fallback when tokenIds is absent', async () => {
    generateObject.mockResolvedValue(
      makeResult({
        annotations: [
          {
            tokenId: 't_002',
            layerId: 'meaning',
            label: 'Reference',
            detail: 'Allusion to a classical river.',
            context: 'Myth',
          },
        ],
      }),
    );

    const { annotations } = await analyzeText(makeAst());

    expect(annotations).toHaveLength(1);
    expect(annotations[0].tokenId).toBe('t_002');
  });

  it('drops a meaning annotation that has neither tokenIds nor tokenId', async () => {
    generateObject.mockResolvedValue(
      makeResult({
        annotations: [
          {
            layerId: 'meaning',
            label: 'Theme',
            detail: 'No tokens attached.',
            context: 'Nothing',
          },
        ],
      }),
    );

    const { annotations } = await analyzeText(makeAst());

    // Empty token list -> nothing expanded (assert the negative space).
    expect(annotations).toHaveLength(0);
  });

  it('passes through non-meaning annotations unchanged', async () => {
    const passthrough = {
      tokenId: 't_003',
      tokenIds: ['t_003'],
      layerId: 'chords',
      label: 'Am',
      detail: 'A minor chord.',
      context: 'Harmony',
    };
    generateObject.mockResolvedValue(makeResult({ annotations: [passthrough] }));

    const { annotations } = await analyzeText(makeAst());

    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toEqual(passthrough);
    // Non-meaning branch must NOT strip tokenIds.
    expect((annotations[0] as Record<string, unknown>).tokenIds).toEqual(['t_003']);
  });

  it('handles a mix of meaning (expanded) and non-meaning (passthrough) annotations', async () => {
    generateObject.mockResolvedValue(
      makeResult({
        annotations: [
          {
            tokenIds: ['t_001', 't_002'],
            layerId: 'meaning',
            label: 'Metaphor',
            detail: 'Flow of time.',
            context: 'Mortality',
          },
          {
            tokenId: 't_003',
            layerId: 'chords',
            label: 'Am',
            detail: 'A minor chord.',
            context: 'Harmony',
          },
        ],
      }),
    );

    const { annotations } = await analyzeText(makeAst());

    // 2 from the expanded meaning + 1 passthrough = 3.
    expect(annotations).toHaveLength(3);
    const meaningTokens = annotations.filter((a) => a.layerId === 'meaning').map((a) => a.tokenId);
    expect(meaningTokens).toEqual(['t_001', 't_002']);
    expect(annotations.some((a) => a.layerId === 'chords' && a.tokenId === 't_003')).toBe(true);
  });

  it('drops generated annotations that reference tokens outside the source AST', async () => {
    generateObject.mockResolvedValue(
      makeResult({
        annotations: [
          {
            tokenIds: ['t_001', 't_999'],
            layerId: 'meaning',
            label: 'Theme',
            detail: 'Mixed valid and invalid tokens.',
            context: 'Integrity',
          },
        ],
      }),
    );

    const { annotations } = await analyzeText(makeAst());

    expect(annotations.map((annotation) => annotation.tokenId)).toEqual(['t_001']);
  });

  it('preserves the meta block from the LLM result', async () => {
    generateObject.mockResolvedValue(
      makeResult({ meta: { theme: 'Grief', tone: 'Somber', summary: 'A lament.' } }),
    );

    const { meta } = await analyzeText(makeAst());

    expect(meta).toEqual({ theme: 'Grief', tone: 'Somber', summary: 'A lament.' });
  });
});

// ── Error propagation ─────────────────────────────────────────────────

describe('analyzeText — error handling', () => {
  it('rethrows when the LLM client fails', async () => {
    generateObject.mockRejectedValue(new Error('LLM unavailable'));

    await expect(analyzeText(makeAst())).rejects.toThrow('LLM unavailable');
  });
});
