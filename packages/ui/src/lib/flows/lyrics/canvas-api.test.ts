import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasAnalysis, LyricsCanvasNeedsAnalysisResponse } from '@flows/shared';

const mocks = vi.hoisted(() => ({
  route: vi.fn(),
  canvasGet: vi.fn(),
  analyzePost: vi.fn(),
}));

vi.mock('@lib/client', () => ({
  api: {
    api: {
      lyrics: (params: { trackId: string }) => {
        mocks.route(params);
        return {
          canvas: {
            get: mocks.canvasGet,
            analyze: { post: mocks.analyzePost },
          },
        };
      },
    },
  },
}));

const { analyzeCanvas, getCanvasAnalysis } = await import('./canvas-api');

function makeAnalysis(overrides: Partial<CanvasAnalysis> = {}): CanvasAnalysis {
  return {
    id: 'canvas-1',
    sourceId: 'track-1',
    sourceType: 'track',
    sourceTextHash: 'hash',
    tokenAst: { sections: [], totalTokens: 0 },
    annotations: [],
    layers: [],
    modelUsed: 'test-model',
    providerUsed: 'test-provider',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeNeedsAnalysis(): LyricsCanvasNeedsAnalysisResponse {
  return {
    needsAnalysis: true,
    source: {
      sourceId: 'track-1',
      sourceType: 'track',
      title: 'Test Title',
      author: 'Test Artist',
      imageUrl: 'https://img.example/cover.jpg',
    },
  };
}

describe('lyrics canvas Eden API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads an existing analysis through the typed dynamic route', async () => {
    mocks.canvasGet.mockResolvedValue({ data: makeAnalysis(), error: null });

    const result = await getCanvasAnalysis('track-1');

    expect(mocks.route).toHaveBeenCalledWith({ trackId: 'track-1' });
    expect(mocks.canvasGet).toHaveBeenCalledWith();
    expect('id' in result && result.id).toBe('canvas-1');
  });

  it('keeps needs-analysis as a successful typed domain state', async () => {
    mocks.canvasGet.mockResolvedValue({ data: makeNeedsAnalysis(), error: null });

    const result = await getCanvasAnalysis('track-1');

    expect('needsAnalysis' in result && result.needsAnalysis).toBe(true);
  });

  it('surfaces a typed backend error', async () => {
    mocks.canvasGet.mockResolvedValue({
      data: null,
      error: {
        value: { code: 'track_not_found', error: 'Track not found' },
      },
    });

    await expect(getCanvasAnalysis('track-1')).rejects.toThrow('Track not found');
  });

  it('falls back when the load error has no public message', async () => {
    mocks.canvasGet.mockResolvedValue({ data: null, error: { value: {} } });

    await expect(getCanvasAnalysis('track-1')).rejects.toThrow('Failed to fetch canvas analysis');
  });

  it('generates an analysis through the typed analyze endpoint', async () => {
    mocks.analyzePost.mockResolvedValue({ data: makeAnalysis(), error: null });

    const result = await analyzeCanvas('track-1');

    expect(mocks.route).toHaveBeenCalledWith({ trackId: 'track-1' });
    expect(mocks.analyzePost).toHaveBeenCalledWith();
    expect(result.id).toBe('canvas-1');
  });

  it('surfaces the typed analyze error', async () => {
    mocks.analyzePost.mockResolvedValue({
      data: null,
      error: {
        value: {
          code: 'analysis_unavailable',
          error: 'AI analysis is temporarily unavailable',
        },
      },
    });

    await expect(analyzeCanvas('track-1')).rejects.toThrow(
      'AI analysis is temporarily unavailable'
    );
  });

  it('rejects an empty analyze success', async () => {
    mocks.analyzePost.mockResolvedValue({ data: null, error: null });

    await expect(analyzeCanvas('track-1')).rejects.toThrow('Failed to generate canvas analysis');
  });
});
