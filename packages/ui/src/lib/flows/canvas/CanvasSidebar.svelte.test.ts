import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { CanvasAnalysis } from '@flows/shared';

// Runes-backed mocked store shared by the sidebar under test.
vi.mock('./stores.svelte', async () => ({
  canvasStore: (await import('./canvas-store.mock.svelte')).mockCanvasStore,
}));

import { mockCanvasStore } from './canvas-store.mock.svelte';
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

describe('CanvasSidebar', () => {
  beforeEach(() => {
    mockCanvasStore.reset();
  });

  it('does not fetch on mount (initial data comes from the route loader)', () => {
    render(CanvasSidebar);
    expect(mockCanvasStore.init).not.toHaveBeenCalled();
  });

  it('always renders the New Canvas button', () => {
    render(CanvasSidebar);
    expect(screen.getByRole('button', { name: /New Canvas/i })).toBeInTheDocument();
  });

  it('shows the empty state when there are no canvases', () => {
    render(CanvasSidebar);
    expect(screen.getByText(/No canvases yet/i)).toBeInTheDocument();
  });

  it('shows the shared loading state instead of the empty/list state while loading', () => {
    mockCanvasStore.isLoading = true;
    render(CanvasSidebar);

    expect(screen.queryByText(/No canvases yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading canvases');
  });

  it('lists canvases with title and author', () => {
    mockCanvasStore.canvases = [
      makeCanvas({ sourceId: 'a', meta: { title: 'Alpha', author: 'Alice' } }),
      makeCanvas({ sourceId: 'b', meta: { title: 'Beta', author: 'Bob' } }),
    ];
    render(CanvasSidebar);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText(/No canvases yet/i)).not.toBeInTheDocument();
  });

  it('falls back to Untitled / User when meta is missing', () => {
    mockCanvasStore.canvases = [makeCanvas({ sourceId: 'a', meta: undefined })];
    render(CanvasSidebar);

    expect(screen.getByText('Untitled')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('loads a canvas when its row is clicked', async () => {
    mockCanvasStore.canvases = [makeCanvas({ sourceId: 'pick-me', meta: { title: 'Pick Me' } })];
    render(CanvasSidebar);

    await fireEvent.click(screen.getByText('Pick Me'));

    expect(mockCanvasStore.loadCanvas).toHaveBeenCalledWith('pick-me');
  });

  it('deletes a canvas when its delete button is clicked', async () => {
    mockCanvasStore.canvases = [makeCanvas({ sourceId: 'del-me', meta: { title: 'Delete Me' } })];
    render(CanvasSidebar);

    await fireEvent.click(screen.getByRole('button', { name: 'Delete canvas Delete Me' }));

    expect(mockCanvasStore.deleteCanvas).toHaveBeenCalledWith('del-me');
  });

  it('clears the active canvas when New Canvas is clicked', async () => {
    render(CanvasSidebar);
    await fireEvent.click(screen.getByRole('button', { name: /New Canvas/i }));
    expect(mockCanvasStore.clearActive).toHaveBeenCalledOnce();
  });

  it('marks the active canvas row semantically', () => {
    const active = makeCanvas({ sourceId: 'active', meta: { title: 'Active One' } });
    mockCanvasStore.canvases = [active];
    mockCanvasStore.activeCanvas = active;
    render(CanvasSidebar);

    const row = screen.getByText('Active One').closest('button') as HTMLElement;
    expect(row).toHaveAttribute('aria-current', 'page');
  });
});
