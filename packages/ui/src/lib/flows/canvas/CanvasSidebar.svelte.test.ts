import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { CanvasAnalysis } from '@flows/shared';

interface CanvasStoreState {
  canvases: CanvasAnalysis[];
  activeCanvas: CanvasAnalysis | null;
  isLoading: boolean;
  isAnalyzing: boolean;
}

// Hoisted so the vi.mock factory (also hoisted) can reference them.
const { state, init, loadCanvas, deleteCanvas, clearActive } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable: w } = require('svelte/store');
  return {
    state: w({ canvases: [], activeCanvas: null, isLoading: false, isAnalyzing: false }),
    init: vi.fn(),
    loadCanvas: vi.fn(),
    deleteCanvas: vi.fn(),
    clearActive: vi.fn(),
  };
});

vi.mock('./stores', () => ({
  canvasStore: {
    subscribe: state.subscribe,
    init: (...a: unknown[]) => init(...a),
    loadCanvas: (...a: unknown[]) => loadCanvas(...a),
    deleteCanvas: (...a: unknown[]) => deleteCanvas(...a),
    clearActive: (...a: unknown[]) => clearActive(...a),
    createAndAnalyze: vi.fn(),
  },
}));

import CanvasSidebar from './CanvasSidebar.svelte';

function makeCanvas(overrides: Partial<CanvasAnalysis> = {}): CanvasAnalysis {
  return {
    id: 'analysis_1',
    sourceId: 'src_1',
    sourceType: 'user_text',
    sourceTextHash: 'hash_1',
    tokenAst: { sections: [], totalTokens: 0 },
    annotations: [],
    layers: [],
    meta: { title: 'First Canvas', author: 'Alice' },
    modelUsed: 'fake-model',
    providerUsed: 'fake-provider',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function setState(partial: Partial<CanvasStoreState>) {
  state.update((s: CanvasStoreState) => ({ ...s, ...partial }));
}

describe('CanvasSidebar', () => {
  beforeEach(() => {
    state.set({ canvases: [], activeCanvas: null, isLoading: false, isAnalyzing: false });
  });

  it('calls store.init on mount', () => {
    render(CanvasSidebar);
    expect(init).toHaveBeenCalledOnce();
  });

  it('always renders the New Canvas button', () => {
    render(CanvasSidebar);
    expect(screen.getByRole('button', { name: /New Canvas/i })).toBeInTheDocument();
  });

  it('shows the empty state when there are no canvases', () => {
    render(CanvasSidebar);
    expect(screen.getByText(/No canvases yet/i)).toBeInTheDocument();
  });

  it('shows a loading spinner instead of the empty/list state while loading', () => {
    setState({ isLoading: true });
    render(CanvasSidebar);

    expect(screen.queryByText(/No canvases yet/i)).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).not.toBeNull();
  });

  it('lists canvases with title and author', () => {
    setState({
      canvases: [
        makeCanvas({ sourceId: 'a', meta: { title: 'Alpha', author: 'Alice' } }),
        makeCanvas({ sourceId: 'b', meta: { title: 'Beta', author: 'Bob' } }),
      ],
    });
    render(CanvasSidebar);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText(/No canvases yet/i)).not.toBeInTheDocument();
  });

  it('falls back to Untitled / User when meta is missing', () => {
    setState({ canvases: [makeCanvas({ sourceId: 'a', meta: undefined })] });
    render(CanvasSidebar);

    expect(screen.getByText('Untitled')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('loads a canvas when its row is clicked', async () => {
    setState({ canvases: [makeCanvas({ sourceId: 'pick-me', meta: { title: 'Pick Me' } })] });
    render(CanvasSidebar);

    await fireEvent.click(screen.getByText('Pick Me'));

    expect(loadCanvas).toHaveBeenCalledWith('pick-me');
  });

  it('deletes a canvas when its delete button is clicked', async () => {
    setState({ canvases: [makeCanvas({ sourceId: 'del-me', meta: { title: 'Delete Me' } })] });
    render(CanvasSidebar);

    await fireEvent.click(screen.getByTitle('Delete Canvas'));

    expect(deleteCanvas).toHaveBeenCalledWith('del-me');
  });

  it('clears the active canvas when New Canvas is clicked', async () => {
    render(CanvasSidebar);
    await fireEvent.click(screen.getByRole('button', { name: /New Canvas/i }));
    expect(clearActive).toHaveBeenCalledOnce();
  });

  it('highlights the active canvas row', () => {
    const active = makeCanvas({ sourceId: 'active', meta: { title: 'Active One' } });
    setState({ canvases: [active], activeCanvas: active });
    render(CanvasSidebar);

    const row = screen.getByText('Active One').closest('button') as HTMLElement;
    expect(row.className).toContain('text-primary-300');
  });
});
