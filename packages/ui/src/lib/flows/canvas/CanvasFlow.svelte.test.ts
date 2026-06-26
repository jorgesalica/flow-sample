import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { CanvasAnalysis } from '@flows/shared';

interface CanvasStoreState {
  canvases: CanvasAnalysis[];
  activeCanvas: CanvasAnalysis | null;
  isLoading: boolean;
  isAnalyzing: boolean;
}

// Hoisted so the vi.mock factory (also hoisted) can reference it.
const { state } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable: w } = require('svelte/store');
  return {
    state: w({ canvases: [], activeCanvas: null, isLoading: false, isAnalyzing: false }),
  };
});

// One mocked store shared by CanvasFlow and all its children.
vi.mock('./stores', () => ({
  canvasStore: {
    subscribe: state.subscribe,
    init: vi.fn(),
    loadCanvas: vi.fn(),
    deleteCanvas: vi.fn(),
    clearActive: vi.fn(),
    createAndAnalyze: vi.fn(),
  },
}));

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

function setState(partial: Partial<CanvasStoreState>) {
  state.update((s: CanvasStoreState) => ({ ...s, ...partial }));
}

describe('CanvasFlow', () => {
  beforeEach(() => {
    state.set({ canvases: [], activeCanvas: null, isLoading: false, isAnalyzing: false });
  });

  describe('no active canvas (editor state)', () => {
    it('shows the default header title and the New Canvas editor', () => {
      render(CanvasFlow);

      expect(screen.getByText('Text Analysis Canvas')).toBeInTheDocument();
      // CanvasEditor heading
      expect(screen.getByRole('heading', { name: 'New Canvas' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Paste your text here...')).toBeInTheDocument();
    });

    it('does not render token content when there is no active canvas', () => {
      render(CanvasFlow);
      expect(document.querySelector('.canvas-renderer')).toBeNull();
      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    });
  });

  describe('with an active canvas (viewer state)', () => {
    beforeEach(() => {
      setState({ activeCanvas: makeActiveCanvas() });
    });

    it('renders the active canvas title and author in the header', () => {
      render(CanvasFlow);
      expect(screen.getByRole('heading', { name: 'The Poem' })).toBeInTheDocument();
      expect(screen.getByText('A. Poet')).toBeInTheDocument();
    });

    it('renders the meta overview with summary, theme and tone', () => {
      render(CanvasFlow);
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('A short overview of the work.')).toBeInTheDocument();
      expect(screen.getByText('Renewal')).toBeInTheDocument();
      expect(screen.getByText('Hopeful')).toBeInTheDocument();
    });

    it('renders the token AST content via TokenRenderer', () => {
      render(CanvasFlow);
      expect(document.querySelector('.canvas-renderer')).not.toBeNull();
      expect(screen.getByText('Bright')).toBeInTheDocument();
      expect(screen.getByText('morning')).toBeInTheDocument();
      expect(screen.getByText('[ Verse ]')).toBeInTheDocument();
    });

    it('renders the layer toggles for the canvas layers', () => {
      render(CanvasFlow);
      expect(screen.getByTitle('Toggle Meaning')).toBeInTheDocument();
    });

    it('does not show the editor when a canvas is active', () => {
      render(CanvasFlow);
      expect(screen.queryByPlaceholderText('Paste your text here...')).not.toBeInTheDocument();
      expect(screen.queryByText('Text Analysis Canvas')).not.toBeInTheDocument();
    });

    it('omits the overview block when meta has no summary', () => {
      setState({ activeCanvas: makeActiveCanvas({ meta: { title: 'No Meta', author: 'X' } }) });
      render(CanvasFlow);
      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
      // Title still renders from header.
      expect(screen.getByRole('heading', { name: 'No Meta' })).toBeInTheDocument();
    });
  });
});
