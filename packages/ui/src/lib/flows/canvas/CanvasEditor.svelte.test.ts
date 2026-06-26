import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

interface CanvasStoreState {
  canvases: unknown[];
  activeCanvas: unknown;
  isLoading: boolean;
  isAnalyzing: boolean;
}

// Hoisted so the vi.mock factory (also hoisted) can reference them.
const { state, createAndAnalyze } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable: w } = require('svelte/store');
  return {
    state: w({ canvases: [], activeCanvas: null, isLoading: false, isAnalyzing: false }),
    createAndAnalyze: vi.fn(),
  };
});

// Mock the store edge so we control isAnalyzing and capture submissions.
vi.mock('./stores', () => ({
  canvasStore: {
    subscribe: state.subscribe,
    createAndAnalyze: (...args: unknown[]) => createAndAnalyze(...args),
    init: vi.fn(),
    loadCanvas: vi.fn(),
    deleteCanvas: vi.fn(),
    clearActive: vi.fn(),
  },
}));

import CanvasEditor from './CanvasEditor.svelte';

function setState(partial: Partial<CanvasStoreState>) {
  state.update((s: CanvasStoreState) => ({ ...s, ...partial }));
}

describe('CanvasEditor', () => {
  beforeEach(() => {
    state.set({ canvases: [], activeCanvas: null, isLoading: false, isAnalyzing: false });
  });

  it('renders the heading and the title/author/text inputs', () => {
    render(CanvasEditor);

    expect(screen.getByRole('heading', { name: 'New Canvas' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Title (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Author (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste your text here...')).toBeInTheDocument();
  });

  it('disables the analyze button while text is empty', () => {
    render(CanvasEditor);
    expect(screen.getByRole('button', { name: /Analyze Text/i })).toBeDisabled();
  });

  it('enables the analyze button once text is entered', async () => {
    render(CanvasEditor);
    const textarea = screen.getByPlaceholderText('Paste your text here...');

    await fireEvent.input(textarea, { target: { value: 'a poem' } });

    expect(screen.getByRole('button', { name: /Analyze Text/i })).not.toBeDisabled();
  });

  it('submits text/title/author to the store on click', async () => {
    render(CanvasEditor);

    await fireEvent.input(screen.getByPlaceholderText('Title (optional)'), {
      target: { value: 'My Title' },
    });
    await fireEvent.input(screen.getByPlaceholderText('Author (optional)'), {
      target: { value: 'My Author' },
    });
    await fireEvent.input(screen.getByPlaceholderText('Paste your text here...'), {
      target: { value: 'the body text' },
    });

    await fireEvent.click(screen.getByRole('button', { name: /Analyze Text/i }));

    expect(createAndAnalyze).toHaveBeenCalledWith('the body text', 'My Title', 'My Author');
  });

  it('does not submit when the text is only whitespace', async () => {
    render(CanvasEditor);
    await fireEvent.input(screen.getByPlaceholderText('Paste your text here...'), {
      target: { value: '   ' },
    });

    // Button stays disabled, and even a forced click is a no-op for whitespace.
    expect(screen.getByRole('button', { name: /Analyze Text/i })).toBeDisabled();
    expect(createAndAnalyze).not.toHaveBeenCalled();
  });

  it('shows the analyzing state and disables inputs/button while analyzing', () => {
    setState({ isAnalyzing: true });
    render(CanvasEditor);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Title (optional)')).toBeDisabled();
    expect(screen.getByPlaceholderText('Paste your text here...')).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not show the analyzing label when idle', () => {
    render(CanvasEditor);
    expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
  });
});
