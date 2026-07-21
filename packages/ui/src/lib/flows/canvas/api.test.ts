import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasAnalysis } from '@flows/shared';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  create: vi.fn(),
  route: vi.fn(),
}));

vi.mock('@lib/client', () => {
  const canvas = Object.assign(
    (params: { id: string }) => {
      mocks.route(params);
      return { get: mocks.get, delete: mocks.remove };
    },
    { get: mocks.list, post: mocks.create }
  );
  return { api: { api: { canvas } } };
});

import { createAndAnalyzeCanvas, deleteCanvas, fetchCanvas, fetchCanvasList } from './api';

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

describe('canvas Eden api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the canvas list', async () => {
    const list = [makeCanvas()];
    mocks.list.mockResolvedValue({ data: list, error: null });
    await expect(fetchCanvasList()).resolves.toEqual(list);
  });

  it('reports list failures', async () => {
    mocks.list.mockResolvedValue({ data: null, error: { status: 500 } });
    await expect(fetchCanvasList()).rejects.toThrow('Failed to fetch canvases');
  });

  it('rejects malformed list responses', async () => {
    mocks.list.mockResolvedValue({ data: [{ id: 'partial' }], error: null });
    await expect(fetchCanvasList()).rejects.toThrow('Invalid canvas list response');
  });

  it('loads one canvas through the typed dynamic route', async () => {
    const canvas = makeCanvas();
    mocks.get.mockResolvedValue({ data: canvas, error: null });
    await expect(fetchCanvas('src_1')).resolves.toEqual(canvas);
    expect(mocks.route).toHaveBeenCalledWith({ id: 'src_1' });
  });

  it('reports missing canvases', async () => {
    mocks.get.mockResolvedValue({ data: { error: 'Canvas not found' }, error: null });
    await expect(fetchCanvas('missing')).rejects.toThrow('Failed to fetch canvas');
  });

  it('rejects malformed single-canvas responses', async () => {
    mocks.get.mockResolvedValue({ data: { id: 'partial' }, error: null });
    await expect(fetchCanvas('src_1')).rejects.toThrow('Invalid canvas response');
  });

  it('deletes through the typed dynamic route', async () => {
    mocks.remove.mockResolvedValue({ data: { success: true }, error: null });
    await deleteCanvas('src_1');
    expect(mocks.route).toHaveBeenCalledWith({ id: 'src_1' });
    expect(mocks.remove).toHaveBeenCalledOnce();
  });

  it('reports delete failures', async () => {
    mocks.remove.mockResolvedValue({ data: null, error: { status: 500 } });
    await expect(deleteCanvas('src_1')).rejects.toThrow('Failed to delete canvas');
  });

  it('creates a canvas with an Eden body', async () => {
    const canvas = makeCanvas();
    mocks.create.mockResolvedValue({ data: canvas, error: null });
    await expect(createAndAnalyzeCanvas('text', 'Title', 'Author')).resolves.toEqual(canvas);
    expect(mocks.create).toHaveBeenCalledWith({ text: 'text', title: 'Title', author: 'Author' });
  });

  it('surfaces a backend create error', async () => {
    mocks.create.mockResolvedValue({ data: null, error: { value: { error: 'Text too long' } } });
    await expect(createAndAnalyzeCanvas('text')).rejects.toThrow('Text too long');
  });

  it('rejects malformed create responses', async () => {
    mocks.create.mockResolvedValue({ data: { id: 'partial' }, error: null });
    await expect(createAndAnalyzeCanvas('text')).rejects.toThrow('Invalid canvas response');
  });
});
