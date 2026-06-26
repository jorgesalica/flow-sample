import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { CanvasAnalysis } from '@flows/shared';

// One runes-backed mocked store shared by CanvasFlow and all its children.
vi.mock('./stores.svelte', async () => ({
  canvasStore: (await import('./canvas-store.mock.svelte')).mockCanvasStore,
}));

import { mockCanvasStore } from './canvas-store.mock.svelte';
import CanvasFlow from './CanvasFlow.svelte';

function makeActiveCanvas(overrides: Partial<CanvasAnalysis> = {}): CanvasAnalysis {
  return {
    id: 'analysis_1',
    sourceId: 'src_1',
    sourceType: 'user_text',
    sourceTextHash: 'hash_1',
    tokenAst: {
      totalTokens: 2,
      sections: [
        {
          id: 's_001',
          type: 'Verse',
          lines: [
            [
              { id: 't_001', text: 'Bright' },
              { id: 't_002', text: 'morning' },
            ],
          ],
        },
      ],
    },
    annotations: [{ tokenId: 't_001', layerId: 'meaning', label: 'theme', detail: 'Hope.' }],
    layers: [{ id: 'meaning', name: 'Meaning', icon: '💡', color: '#22d3ee' }],
    meta: {
      title: 'The Poem',
      author: 'A. Poet',
      summary: 'A short overview of the work.',
      theme: 'Renewal',
      tone: 'Hopeful',
    },
    modelUsed: 'fake-model',
    providerUsed: 'fake-provider',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CanvasFlow', () => {
  beforeEach(() => {
    mockCanvasStore.reset();
  });

  it('seeds the store with the canvases passed from the loader', () => {
    const loaded = [makeActiveCanvas({ id: 'l1', sourceId: 'loaded_1' })];
    render(CanvasFlow, { props: { canvases: loaded } });

    expect(mockCanvasStore.setCanvases).toHaveBeenCalledWith(loaded);
    expect(mockCanvasStore.canvases).toEqual(loaded);
  });

  describe('no active canvas (editor state)', () => {
    it('shows the default header title and the New Canvas editor', () => {
      render(CanvasFlow, { props: { canvases: [] } });

      expect(screen.getByText('Text Analysis Canvas')).toBeInTheDocument();
      // CanvasEditor heading
      expect(screen.getByRole('heading', { name: 'New Canvas' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Paste your text here...')).toBeInTheDocument();
    });

    it('does not render token content when there is no active canvas', () => {
      render(CanvasFlow, { props: { canvases: [] } });
      expect(document.querySelector('.canvas-renderer')).toBeNull();
      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    });
  });

  describe('with an active canvas (viewer state)', () => {
    beforeEach(() => {
      mockCanvasStore.activeCanvas = makeActiveCanvas();
    });

    it('renders the active canvas title and author in the header', () => {
      render(CanvasFlow, { props: { canvases: [] } });
      expect(screen.getByRole('heading', { name: 'The Poem' })).toBeInTheDocument();
      expect(screen.getByText('A. Poet')).toBeInTheDocument();
    });

    it('renders the meta overview with summary, theme and tone', () => {
      render(CanvasFlow, { props: { canvases: [] } });
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('A short overview of the work.')).toBeInTheDocument();
      expect(screen.getByText('Renewal')).toBeInTheDocument();
      expect(screen.getByText('Hopeful')).toBeInTheDocument();
    });

    it('renders the token AST content via TokenRenderer', () => {
      render(CanvasFlow, { props: { canvases: [] } });
      expect(document.querySelector('.canvas-renderer')).not.toBeNull();
      expect(screen.getByText('Bright')).toBeInTheDocument();
      expect(screen.getByText('morning')).toBeInTheDocument();
      expect(screen.getByText('[ Verse ]')).toBeInTheDocument();
    });

    it('renders the layer toggles for the canvas layers', () => {
      render(CanvasFlow, { props: { canvases: [] } });
      expect(screen.getByTitle('Toggle Meaning')).toBeInTheDocument();
    });

    it('does not show the editor when a canvas is active', () => {
      render(CanvasFlow, { props: { canvases: [] } });
      expect(screen.queryByPlaceholderText('Paste your text here...')).not.toBeInTheDocument();
      expect(screen.queryByText('Text Analysis Canvas')).not.toBeInTheDocument();
    });

    it('omits the overview block when meta has no summary', () => {
      mockCanvasStore.activeCanvas = makeActiveCanvas({ meta: { title: 'No Meta', author: 'X' } });
      render(CanvasFlow, { props: { canvases: [] } });
      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
      // Title still renders from header.
      expect(screen.getByRole('heading', { name: 'No Meta' })).toBeInTheDocument();
    });
  });
});
