import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasAnalysis } from '@flows/shared';
import type { LyricsRepository } from '../../../src/domain/ports';

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

vi.mock('../../../src/backend/canvas/repository', () => ({
  SQLiteLyricsCanvasRepository: class {},
}));

vi.mock('../../../src/backend/canvas/service', () => ({
  LyricsCanvasService: class {
    load = mocks.load;
    analyze = mocks.analyze;
  },
}));

const { createCanvasRoutes } = await import('../../../src/backend/canvas/canvas.routes');

const lyricsRepository = {} as LyricsRepository;

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
  return createCanvasRoutes(lyricsRepository).handle(
    new Request(`http://localhost${path}`, { method }),
  );
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

  it('keeps a genuinely missing track as 404', async () => {
    mocks.load.mockResolvedValue({ kind: 'track_not_found' });

    const response = await request('/missing/canvas');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Track not found' });
  });

  it('maps provider failures to a sanitized 503 response', async () => {
    mocks.analyze.mockRejectedValue(
      new Error('[mistral] API error 400: secret provider response'),
    );

    const response = await request('/track-1/canvas/analyze', 'POST');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'AI analysis is temporarily unavailable',
    });
    expect(mocks.logError).toHaveBeenCalledWith(
      expect.objectContaining({ trackId: 'track-1' }),
      'Canvas analysis failed',
    );
  });

  it('returns a created analysis from the provider service', async () => {
    const analysis = makeAnalysis();
    mocks.analyze.mockResolvedValue({ kind: 'created', analysis });

    const response = await request('/track-1/canvas/analyze', 'POST');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(analysis);
  });
});
