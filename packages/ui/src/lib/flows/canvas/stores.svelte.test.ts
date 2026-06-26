import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CanvasAnalysis } from '@flows/shared';

// ── Mock the edge: the flow's api.ts (raw fetch wrapper) and the toast helper ──
vi.mock('./api', () => ({
  fetchCanvasList: vi.fn(),
  fetchCanvas: vi.fn(),
  deleteCanvas: vi.fn(),
  createAndAnalyzeCanvas: vi.fn(),
}));

vi.mock('@lib/toast', () => ({
  showError: vi.fn(),
}));

import * as api from './api';
import { showError } from '@lib/toast';
import { canvasStore } from './stores.svelte';

// ── Fixtures (fixed fake data, no PII) ──────────────────────────────
function makeCanvas(overrides: Partial<CanvasAnalysis> = {}): CanvasAnalysis {
  return {
    id: 'analysis_1',
    sourceId: 'src_1',
    sourceType: 'user_text',
    sourceTextHash: 'hash_1',
    tokenAst: { sections: [], totalTokens: 0 },
    annotations: [],
    layers: [],
    meta: { title: 'First Canvas', author: 'Tester' },
    modelUsed: 'fake-model',
    providerUsed: 'fake-provider',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const mockApi = vi.mocked(api);
const mockShowError = vi.mocked(showError);

describe('canvasStore', () => {
  beforeEach(() => {
    // Reset the singleton runes store to a known baseline before each test.
    canvasStore.setCanvases([]);
    canvasStore.clearActive();
    mockApi.fetchCanvasList.mockResolvedValue([]);
  });

  it('starts empty / not loading', () => {
    expect(canvasStore.activeCanvas).toBeNull();
    expect(canvasStore.isLoading).toBe(false);
    expect(canvasStore.isAnalyzing).toBe(false);
  });

  describe('setCanvases', () => {
    it('replaces the canvas list with loader-provided data', () => {
      const list = [makeCanvas({ id: 'a' }), makeCanvas({ id: 'b', sourceId: 'src_2' })];

      canvasStore.setCanvases(list);

      expect(canvasStore.canvases).toEqual(list);
      // Pure seeding — no network call.
      expect(mockApi.fetchCanvasList).not.toHaveBeenCalled();
    });
  });

  describe('init', () => {
    it('loads the canvas list on success and clears loading', async () => {
      const list = [makeCanvas({ id: 'a' }), makeCanvas({ id: 'b', sourceId: 'src_2' })];
      mockApi.fetchCanvasList.mockResolvedValueOnce(list);

      await canvasStore.init();

      expect(mockApi.fetchCanvasList).toHaveBeenCalledOnce();
      expect(canvasStore.canvases).toEqual(list);
      expect(canvasStore.isLoading).toBe(false);
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('surfaces an error via showError and clears loading on failure', async () => {
      mockApi.fetchCanvasList.mockRejectedValueOnce(new Error('boom'));

      await canvasStore.init();

      expect(mockShowError).toHaveBeenCalledWith('boom');
      expect(canvasStore.isLoading).toBe(false);
    });

    it('stringifies non-Error rejections for the toast', async () => {
      mockApi.fetchCanvasList.mockRejectedValueOnce('plain string failure');

      await canvasStore.init();

      expect(mockShowError).toHaveBeenCalledWith('plain string failure');
    });
  });

  describe('loadCanvas', () => {
    it('sets activeCanvas on success', async () => {
      const canvas = makeCanvas({ id: 'loaded', sourceId: 'src_loaded' });
      mockApi.fetchCanvas.mockResolvedValueOnce(canvas);

      await canvasStore.loadCanvas('src_loaded');

      expect(mockApi.fetchCanvas).toHaveBeenCalledWith('src_loaded');
      expect(canvasStore.activeCanvas).toEqual(canvas);
      expect(canvasStore.isLoading).toBe(false);
    });

    it('shows an error and leaves activeCanvas null on failure', async () => {
      mockApi.fetchCanvas.mockRejectedValueOnce(new Error('not found'));

      await canvasStore.loadCanvas('missing');

      expect(mockShowError).toHaveBeenCalledWith('not found');
      expect(canvasStore.activeCanvas).toBeNull();
      expect(canvasStore.isLoading).toBe(false);
    });
  });

  describe('createAndAnalyze', () => {
    it('prepends the new canvas, sets it active, and clears analyzing', async () => {
      // Seed an existing canvas first.
      canvasStore.setCanvases([makeCanvas({ id: 'existing', sourceId: 'old' })]);

      const created = makeCanvas({ id: 'new', sourceId: 'new_src' });
      mockApi.createAndAnalyzeCanvas.mockResolvedValueOnce(created);

      await canvasStore.createAndAnalyze('some text', 'Title', 'Author');

      expect(mockApi.createAndAnalyzeCanvas).toHaveBeenCalledWith('some text', 'Title', 'Author');
      expect(canvasStore.canvases[0]).toEqual(created); // prepended
      expect(canvasStore.canvases).toHaveLength(2);
      expect(canvasStore.activeCanvas).toEqual(created);
      expect(canvasStore.isAnalyzing).toBe(false);
    });

    it('shows an error and clears analyzing on failure', async () => {
      mockApi.createAndAnalyzeCanvas.mockRejectedValueOnce(new Error('analysis failed'));

      await canvasStore.createAndAnalyze('text');

      expect(mockShowError).toHaveBeenCalledWith('analysis failed');
      expect(canvasStore.isAnalyzing).toBe(false);
    });
  });

  describe('deleteCanvas', () => {
    it('removes the canvas from the list and clears active when it matches', async () => {
      const keep = makeCanvas({ id: 'keep', sourceId: 'keep_src' });
      const remove = makeCanvas({ id: 'remove', sourceId: 'remove_src' });
      canvasStore.setCanvases([keep, remove]);

      mockApi.fetchCanvas.mockResolvedValueOnce(remove);
      await canvasStore.loadCanvas('remove_src');
      expect(canvasStore.activeCanvas?.sourceId).toBe('remove_src');

      mockApi.deleteCanvas.mockResolvedValueOnce(undefined);
      await canvasStore.deleteCanvas('remove_src');

      expect(mockApi.deleteCanvas).toHaveBeenCalledWith('remove_src');
      expect(canvasStore.canvases.map((c) => c.sourceId)).toEqual(['keep_src']);
      expect(canvasStore.activeCanvas).toBeNull(); // active matched -> cleared
    });

    it('keeps a non-matching active canvas after deleting another', async () => {
      const active = makeCanvas({ id: 'active', sourceId: 'active_src' });
      const other = makeCanvas({ id: 'other', sourceId: 'other_src' });
      canvasStore.setCanvases([active, other]);

      mockApi.fetchCanvas.mockResolvedValueOnce(active);
      await canvasStore.loadCanvas('active_src');

      mockApi.deleteCanvas.mockResolvedValueOnce(undefined);
      await canvasStore.deleteCanvas('other_src');

      expect(canvasStore.canvases.map((c) => c.sourceId)).toEqual(['active_src']);
      expect(canvasStore.activeCanvas?.sourceId).toBe('active_src'); // untouched
    });

    it('shows an error and does not mutate the list on failure', async () => {
      const a = makeCanvas({ id: 'a', sourceId: 'a_src' });
      canvasStore.setCanvases([a]);

      mockApi.deleteCanvas.mockRejectedValueOnce(new Error('delete failed'));
      await canvasStore.deleteCanvas('a_src');

      expect(mockShowError).toHaveBeenCalledWith('delete failed');
      expect(canvasStore.canvases.map((c) => c.sourceId)).toEqual(['a_src']); // unchanged
    });
  });

  describe('clearActive', () => {
    it('nulls out the active canvas', async () => {
      const canvas = makeCanvas({ sourceId: 'to_clear' });
      mockApi.fetchCanvas.mockResolvedValueOnce(canvas);
      await canvasStore.loadCanvas('to_clear');
      expect(canvasStore.activeCanvas).not.toBeNull();

      canvasStore.clearActive();

      expect(canvasStore.activeCanvas).toBeNull();
    });
  });
});
