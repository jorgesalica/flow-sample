import { describe, it, expect } from 'vitest';
import {
  meaningAnnotationSchema,
  textAnnotationSchema,
  textAnalysisSchema,
} from '../../src/backend/schemas';

// ── Fixtures ──────────────────────────────────────────────────────────

function makeMeaningAnnotation(overrides: Record<string, unknown> = {}) {
  return {
    tokenIds: ['t_001', 't_002'],
    layerId: 'meaning',
    label: 'Metaphor',
    detail: 'The river symbolizes the passage of time.',
    context: 'Mortality',
    ...overrides,
  };
}

function makeAnalysisResult(overrides: Record<string, unknown> = {}) {
  return {
    annotations: [makeMeaningAnnotation()],
    meta: {
      theme: 'Loss',
      tone: 'Melancholic',
      summary: 'A reflection on grief.',
    },
    ...overrides,
  };
}

// ── meaningAnnotationSchema ───────────────────────────────────────────

describe('meaningAnnotationSchema', () => {
  it('parses a valid annotation with a tokenIds array', () => {
    const parsed = meaningAnnotationSchema.parse(makeMeaningAnnotation());
    expect(parsed.tokenIds).toEqual(['t_001', 't_002']);
    expect(parsed.layerId).toBe('meaning');
    expect(parsed.label).toBe('Metaphor');
  });

  it('parses a valid annotation with the single tokenId fallback', () => {
    const parsed = meaningAnnotationSchema.parse(
      makeMeaningAnnotation({ tokenIds: undefined, tokenId: 't_007' }),
    );
    expect(parsed.tokenId).toBe('t_007');
    expect(parsed.tokenIds).toBeUndefined();
  });

  it('parses with neither tokenIds nor tokenId (both optional)', () => {
    const parsed = meaningAnnotationSchema.parse(makeMeaningAnnotation({ tokenIds: undefined }));
    expect(parsed.tokenIds).toBeUndefined();
    expect(parsed.tokenId).toBeUndefined();
  });

  it('rejects a layerId other than "meaning"', () => {
    const result = meaningAnnotationSchema.safeParse(makeMeaningAnnotation({ layerId: 'chords' }));
    expect(result.success).toBe(false);
  });

  it('rejects when required label is missing', () => {
    const { label: _label, ...rest } = makeMeaningAnnotation();
    const result = meaningAnnotationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when required detail is missing', () => {
    const { detail: _detail, ...rest } = makeMeaningAnnotation();
    const result = meaningAnnotationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when required context is missing', () => {
    const { context: _context, ...rest } = makeMeaningAnnotation();
    const result = meaningAnnotationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when tokenIds contains a non-string element', () => {
    const result = meaningAnnotationSchema.safeParse(
      makeMeaningAnnotation({ tokenIds: ['t_001', 42] }),
    );
    expect(result.success).toBe(false);
  });
});

// ── textAnnotationSchema (discriminated union) ────────────────────────

describe('textAnnotationSchema', () => {
  it('accepts a meaning annotation through the union', () => {
    const parsed = textAnnotationSchema.parse(makeMeaningAnnotation());
    expect(parsed.layerId).toBe('meaning');
  });

  it('rejects an annotation with an unknown discriminator value', () => {
    const result = textAnnotationSchema.safeParse(
      makeMeaningAnnotation({ layerId: 'unknown-layer' }),
    );
    expect(result.success).toBe(false);
  });
});

// ── textAnalysisSchema ────────────────────────────────────────────────

describe('textAnalysisSchema', () => {
  it('parses a full valid analysis result', () => {
    const parsed = textAnalysisSchema.parse(makeAnalysisResult());
    expect(parsed.annotations).toHaveLength(1);
    expect(parsed.meta.theme).toBe('Loss');
    expect(parsed.meta.tone).toBe('Melancholic');
    expect(parsed.meta.summary).toBe('A reflection on grief.');
  });

  it('accepts an empty annotations array', () => {
    const parsed = textAnalysisSchema.parse(makeAnalysisResult({ annotations: [] }));
    expect(parsed.annotations).toEqual([]);
  });

  it('accepts null meta fields (theme/tone/summary are nullable)', () => {
    const parsed = textAnalysisSchema.parse(
      makeAnalysisResult({ meta: { theme: null, tone: null, summary: null } }),
    );
    expect(parsed.meta.theme).toBeNull();
    expect(parsed.meta.tone).toBeNull();
    expect(parsed.meta.summary).toBeNull();
  });

  it('rejects when meta is missing', () => {
    const { meta: _meta, ...rest } = makeAnalysisResult();
    const result = textAnalysisSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when annotations is not an array', () => {
    const result = textAnalysisSchema.safeParse(
      makeAnalysisResult({ annotations: 'not-an-array' }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects when a meta field is the wrong type', () => {
    const result = textAnalysisSchema.safeParse(
      makeAnalysisResult({ meta: { theme: 123, tone: null, summary: null } }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects when an annotation in the list is invalid', () => {
    const result = textAnalysisSchema.safeParse(
      makeAnalysisResult({ annotations: [makeMeaningAnnotation({ layerId: 'bogus' })] }),
    );
    expect(result.success).toBe(false);
  });
});
