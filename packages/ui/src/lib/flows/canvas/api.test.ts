import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CanvasAnalysis } from '@flows/shared';
import { fetchCanvasList, fetchCanvas, deleteCanvas, createAndAnalyzeCanvas } from './api';

const API_BASE = '/api/canvas';

function makeCanvas(overrides: Partial<CanvasAnalysis> = {}): CanvasAnalysis {
  return {
    id: 'analysis_1',
    sourceId: 'src_1',
    sourceType: 'user_text',
    sourceTextHash: 'hash_1',
    tokenAst: { sections: [], totalTokens: 0 },
    annotations: [],
    layers: [],
    meta: { title: 'Canvas', author: 'Tester' },
    modelUsed: 'fake-model',
    providerUsed: 'fake-provider',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function okResponse(body: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function errorResponse(body: unknown = {}): Response {
  return {
    ok: false,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const fetchMock = vi.fn();

describe('canvas api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchCanvasList', () => {
    it('GETs the list endpoint and returns parsed canvases', async () => {
      const list = [makeCanvas({ id: 'a' }), makeCanvas({ id: 'b' })];
      fetchMock.mockResolvedValueOnce(okResponse(list));

      const result = await fetchCanvasList();

      expect(fetchMock).toHaveBeenCalledWith(API_BASE);
      expect(result).toEqual(list);
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse());
      await expect(fetchCanvasList()).rejects.toThrow('Failed to fetch canvases');
    });
  });

  describe('fetchCanvas', () => {
    it('GETs the canvas by id', async () => {
      const canvas = makeCanvas({ id: 'one' });
      fetchMock.mockResolvedValueOnce(okResponse(canvas));

      const result = await fetchCanvas('abc');

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/abc`);
      expect(result).toEqual(canvas);
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse());
      await expect(fetchCanvas('missing')).rejects.toThrow('Failed to fetch canvas');
    });
  });

  describe('deleteCanvas', () => {
    it('issues a DELETE to the id endpoint', async () => {
      fetchMock.mockResolvedValueOnce(okResponse(undefined));

      await deleteCanvas('xyz');

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/xyz`, { method: 'DELETE' });
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse());
      await expect(deleteCanvas('xyz')).rejects.toThrow('Failed to delete canvas');
    });
  });

  describe('createAndAnalyzeCanvas', () => {
    it('POSTs the text/title/author payload and returns the new canvas', async () => {
      const created = makeCanvas({ id: 'created' });
      fetchMock.mockResolvedValueOnce(okResponse(created));

      const result = await createAndAnalyzeCanvas('poem text', 'A Title', 'An Author');

      expect(fetchMock).toHaveBeenCalledWith(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'poem text', title: 'A Title', author: 'An Author' }),
      });
      expect(result).toEqual(created);
    });

    it('serializes undefined title/author out of the body', async () => {
      fetchMock.mockResolvedValueOnce(okResponse(makeCanvas()));

      await createAndAnalyzeCanvas('just text');

      const [, init] = fetchMock.mock.calls[0];
      expect(init.body).toBe(JSON.stringify({ text: 'just text' }));
    });

    it('throws with the backend-provided error message when present', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse({ error: 'Text too long' }));
      await expect(createAndAnalyzeCanvas('x')).rejects.toThrow('Text too long');
    });

    it('falls back to a generic message when the error body has no error field', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse({}));
      await expect(createAndAnalyzeCanvas('x')).rejects.toThrow('Failed to create canvas');
    });

    it('falls back to a generic message when the error body is not JSON', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('invalid json')),
      } as unknown as Response);
      await expect(createAndAnalyzeCanvas('x')).rejects.toThrow('Failed to create canvas');
    });
  });
});
