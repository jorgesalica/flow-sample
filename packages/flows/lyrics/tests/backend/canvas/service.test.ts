import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasAnalysis, TokenAST } from '@flows/shared';
import type { LyricsRepository } from '../../../src/domain/ports';
import type { LyricsCanvasRepository, LyricsCanvasTrack } from '../../../src/backend/canvas/repository';

const mocks = vi.hoisted(() => {
  const tokenAst: TokenAST = {
    totalTokens: 1,
    sections: [
      {
        id: 's_001',
        type: 'Verse',
        lines: [[{ id: 't_001', text: 'hello' }]],
      },
    ],
  };

  return {
    findAnalysisBySourceId: vi.fn(),
    saveAnalysis: vi.fn(),
    tokenize: vi.fn(() => tokenAst),
    analyzeLyrics: vi.fn(),
    tokenAst,
  };
});

vi.mock('@flows/core', () => ({
  findAnalysisBySourceId: mocks.findAnalysisBySourceId,
  saveAnalysis: mocks.saveAnalysis,
  tokenize: mocks.tokenize,
}));

vi.mock('../../../src/backend/canvas/music-analyzer', () => ({
  analyzeLyrics: mocks.analyzeLyrics,
}));

const { LyricsCanvasService } = await import('../../../src/backend/canvas/service');

function makeTrack(overrides: Partial<LyricsCanvasTrack> = {}): LyricsCanvasTrack {
  return {
    id: 'track-1',
    title: 'A Song',
    artist: 'An Artist',
    imageUrl: null,
    plainLyrics: 'hello',
    ...overrides,
  };
}

function makeCanvasRepository(track: LyricsCanvasTrack | null): LyricsCanvasRepository {
  return {
    findTrackDetails: vi.fn(() => track),
  };
}

function makeLyricsRepository(): LyricsRepository {
  return {
    findByTrackId: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    markNotFound: vi.fn(async () => undefined),
    getPendingTrackIds: vi.fn(async () => []),
    getStats: vi.fn(async () => ({ total: 0, found: 0, notFound: 0, pending: 0 })),
    getLibraryWithStatus: vi.fn(async () => []),
    getInterpretation: vi.fn(async () => 'A cached interpretation'),
    saveInterpretation: vi.fn(async () => undefined),
  };
}

describe('LyricsCanvasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findAnalysisBySourceId.mockReturnValue(null);
    mocks.analyzeLyrics.mockResolvedValue({
      annotations: [{ tokenId: 't_001', layerId: 'meaning', label: 'Theme', detail: 'Detail' }],
      meta: { key: 'C', bpm: 90, mood: 'Calm' },
      modelUsed: 'llama-3.3-70b-versatile',
      providerUsed: 'groq',
    });
  });

  it('returns a cached analysis before touching the music database', async () => {
    const cached = {
      id: 'ca_1',
      sourceId: 'track-1',
      sourceType: 'track',
      sourceTextHash: 'hash',
      tokenAst: mocks.tokenAst,
      annotations: [],
      layers: [],
      modelUsed: 'model',
      providerUsed: 'provider',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies CanvasAnalysis;
    mocks.findAnalysisBySourceId.mockReturnValue(cached);
    const canvasRepository = makeCanvasRepository(makeTrack());

    const service = new LyricsCanvasService(canvasRepository, makeLyricsRepository());

    await expect(service.load('track-1')).resolves.toEqual({ kind: 'found', analysis: cached });
    expect(canvasRepository.findTrackDetails).not.toHaveBeenCalled();
  });

  it('reports a valid source when lyrics exist but analysis is missing', async () => {
    const service = new LyricsCanvasService(makeCanvasRepository(makeTrack({ imageUrl: 'cover.jpg' })), makeLyricsRepository());

    await expect(service.load('track-1')).resolves.toEqual({
      kind: 'analysis_missing',
      source: {
        sourceId: 'track-1',
        sourceType: 'track',
        title: 'A Song',
        author: 'An Artist',
        imageUrl: 'cover.jpg',
      },
    });
  });

  it('creates and saves an analysis from track lyrics', async () => {
    const lyricsRepository = makeLyricsRepository();
    const service = new LyricsCanvasService(makeCanvasRepository(makeTrack()), lyricsRepository);

    const result = await service.analyze('track-1');

    expect(result.kind).toBe('created');
    if (result.kind !== 'created') {
      throw new Error('Expected analysis creation');
    }

    expect(lyricsRepository.getInterpretation).toHaveBeenCalledWith('track-1');
    expect(mocks.tokenize).toHaveBeenCalledWith('hello');
    expect(mocks.analyzeLyrics).toHaveBeenCalledWith(
      mocks.tokenAst,
      'A Song',
      'An Artist',
      'A cached interpretation',
    );
    expect(result.analysis.layers.map((layer) => layer.id)).toContain('meaning');
    expect(mocks.saveAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'track-1',
        sourceType: 'track',
        sourceTextHash: expect.any(String),
        tokenAst: mocks.tokenAst,
        modelUsed: 'llama-3.3-70b-versatile',
        providerUsed: 'groq',
      }),
    );
  });

  it('does not analyze missing lyrics', async () => {
    const service = new LyricsCanvasService(makeCanvasRepository(makeTrack({ plainLyrics: null })), makeLyricsRepository());

    await expect(service.analyze('track-1')).resolves.toEqual({ kind: 'source_unavailable' });
    expect(mocks.analyzeLyrics).not.toHaveBeenCalled();
    expect(mocks.saveAnalysis).not.toHaveBeenCalled();
  });
});
