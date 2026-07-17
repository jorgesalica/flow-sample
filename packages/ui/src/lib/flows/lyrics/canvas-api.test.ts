import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CanvasAnalysis } from '@flows/shared';
import { getCanvasAnalysis, analyzeCanvas, type CanvasStatusResponse } from './canvas-api';

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as Response;
}

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

function makeNeedsAnalysis(): CanvasStatusResponse {
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

describe('canvas-api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getCanvasAnalysis', () => {
    it('GETs the canvas endpoint and returns an existing analysis', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(makeAnalysis()));

      const result = await getCanvasAnalysis('track-1');

      expect(fetch).toHaveBeenCalledWith('/api/lyrics/track-1/canvas');
      expect('id' in result && result.id).toBe('canvas-1');
    });

    it('returns the needsAnalysis status body as a successful domain state', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(makeNeedsAnalysis()));

      const result = await getCanvasAnalysis('track-1');

      expect('needsAnalysis' in result && result.needsAnalysis).toBe(true);
    });

    it('throws the server-provided message on a 404', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ error: 'Track not found' }, { ok: false, status: 404 })
      );

      await expect(getCanvasAnalysis('track-1')).rejects.toThrow('Track not found');
    });

    it('throws on non-404 error responses', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({}, { ok: false, status: 500 })
      );

      await expect(getCanvasAnalysis('track-1')).rejects.toThrow('Failed to fetch canvas analysis');
    });
  });

  describe('analyzeCanvas', () => {
    it('POSTs to the analyze endpoint and returns the analysis', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(makeAnalysis()));

      const result = await analyzeCanvas('track-1');

      expect(fetch).toHaveBeenCalledWith('/api/lyrics/track-1/canvas/analyze', { method: 'POST' });
      expect(result.id).toBe('canvas-1');
    });

    it('throws the server-provided error message on failure', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ error: 'Model timed out' }, { ok: false, status: 500 })
      );

      await expect(analyzeCanvas('track-1')).rejects.toThrow('Model timed out');
    });

    it('falls back to a generic message when the error body is unparseable', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      } as unknown as Response);

      await expect(analyzeCanvas('track-1')).rejects.toThrow('Failed to generate canvas analysis');
    });
  });
});
