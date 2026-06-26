import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CanvasAnalysis } from '@flows/shared';

// ── Mock the typed Eden client edge ─────────────────────────────────
const canvasGet = vi.fn();

vi.mock('@lib/client', () => ({
  api: {
    api: {
      canvas: {
        get: (...args: unknown[]) => canvasGet(...args),
      },
    },
  },
}));

import { load } from './+page';

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

// The loader takes no inputs we rely on, but `load` is typed as PageLoad —
// pass a minimal typed stand-in for the SvelteKit load event.
const event = {} as Parameters<typeof load>[0];
const runLoad = () => load(event);

describe('canvas +page loader', () => {
  beforeEach(() => {
    canvasGet.mockReset();
  });

  it('returns the canvas list fetched from the Eden client', async () => {
    const list = [makeCanvas({ id: 'a' }), makeCanvas({ id: 'b', sourceId: 'src_2' })];
    canvasGet.mockResolvedValueOnce({ data: list, error: null });

    const result = await runLoad();

    expect(canvasGet).toHaveBeenCalledOnce();
    expect(result).toEqual({ canvases: list });
  });

  it('falls back to an empty list when the client returns an error', async () => {
    canvasGet.mockResolvedValueOnce({ data: null, error: { status: 500, value: 'boom' } });

    const result = await runLoad();

    expect(result).toEqual({ canvases: [] });
  });

  it('falls back to an empty list when data is null without an error', async () => {
    canvasGet.mockResolvedValueOnce({ data: null, error: null });

    const result = await runLoad();

    expect(result).toEqual({ canvases: [] });
  });
});
