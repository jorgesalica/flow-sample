import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LYRICS_CANVAS_ERROR_CODES, type CanvasAnalysis } from '@flows/shared';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  analyze: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@flows/core', () => ({
  logger: {
    child: () => ({
      error: mocks.logError,
    }),
  },
}));

const { createCanvasRoutes } = await import('../../../src/backend/canvas/canvas.routes');

const service = {
  load: mocks.load,
  analyze: mocks.analyze,
};

function makeAnalysis(): CanvasAnalysis {
  return {
    id: 'canvas-1',
    sourceId: 'track-1',
    sourceType: 'track',
    sourceTextHash: 'hash',
    tokenAst: { sections: [], totalTokens: 0 },
    annotations: [],
    layers: [],
    modelUsed: 'llama-3.3-70b-versatile',
    providerUsed: 'groq',
    createdAt: '2026-07-17T00:00:00.000Z',
    updatedAt: '2026-07-17T00:00:00.000Z',
  };
}

function request(path: string, method = 'GET'): Promise<Response> {
  return createCanvasRoutes(service).handle(new Request(`http://localhost${path}`, { method }));
}

describe('Lyrics canvas routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns analysis_missing as a successful domain state', async () => {
    mocks.load.mockResolvedValue({
      kind: 'analysis_missing',
      source: {
        sourceId: 'track-1',
        sourceType: 'track',
        title: 'A Song',
        author: 'An Artist',
        imageUrl: null,
      },
    });

    const response = await request('/track-1/canvas');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      needsAnalysis: true,
      source: {
        sourceId: 'track-1',
        sourceType: 'track',
        title: 'A Song',
        author: 'An Artist',
        imageUrl: null,
      },
    });
  });

  it('returns an existing analysis as the successful response variant', async () => {
    const analysis = makeAnalysis();
    mocks.load.mockResolvedValue({ kind: 'found', analysis });

    const response = await request('/track-1/canvas');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(analysis);
  });

  it('keeps a genuinely missing track as 404', async () => {
    mocks.load.mockResolvedValue({ kind: 'track_not_found' });

    const response = await request('/missing/canvas');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: LYRICS_CANVAS_ERROR_CODES.TRACK_NOT_FOUND,
      error: 'Track not found',
    });
  });

  it('distinguishes missing lyrics from a missing track', async () => {
    mocks.load.mockResolvedValue({ kind: 'lyrics_missing' });

    const response = await request('/track-1/canvas');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: LYRICS_CANVAS_ERROR_CODES.LYRICS_MISSING,
      error: 'Lyrics not available for this track',
    });
  });

  it('maps provider failures to a sanitized 503 response', async () => {
    mocks.analyze.mockRejectedValue(new Error('[mistral] API error 400: secret provider response'));

    const response = await request('/track-1/canvas/analyze', 'POST');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: LYRICS_CANVAS_ERROR_CODES.ANALYSIS_UNAVAILABLE,
      error: 'AI analysis is temporarily unavailable',
    });
    expect(mocks.logError).toHaveBeenCalledWith(
      expect.objectContaining({ trackId: 'track-1' }),
      'Canvas analysis failed',
    );
  });

  it('maps an unavailable source to the explicit 400 variant', async () => {
    mocks.analyze.mockResolvedValue({ kind: 'source_unavailable' });

    const response = await request('/track-1/canvas/analyze', 'POST');

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: LYRICS_CANVAS_ERROR_CODES.SOURCE_UNAVAILABLE,
      error: 'Track or lyrics not available',
    });
  });

  it('returns a created analysis from the provider service', async () => {
    const analysis = makeAnalysis();
    mocks.analyze.mockResolvedValue({ kind: 'created', analysis });

    const response = await request('/track-1/canvas/analyze', 'POST');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(analysis);
  });
});
