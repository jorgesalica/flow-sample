import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

// Mock the store edge so we control isAnalyzing and capture submissions.
vi.mock('./stores.svelte', async () => ({
  canvasStore: (await import('./canvas-store.mock.svelte')).mockCanvasStore,
}));

import { mockCanvasStore } from './canvas-store.mock.svelte';
import CanvasEditor from './CanvasEditor.svelte';

describe('CanvasEditor', () => {
  beforeEach(() => {
    mockCanvasStore.reset();
  });

  it('renders the heading and the title/author/text inputs', () => {
    render(CanvasEditor);

    expect(screen.getByRole('heading', { name: 'New Canvas' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Canvas title' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Canvas author' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Text to analyze' })).toBeInTheDocument();
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

    expect(mockCanvasStore.createAndAnalyze).toHaveBeenCalledWith(
      'the body text',
      'My Title',
      'My Author'
    );
  });

  it('does not submit when the text is only whitespace', async () => {
    render(CanvasEditor);
    await fireEvent.input(screen.getByPlaceholderText('Paste your text here...'), {
      target: { value: '   ' },
    });

    // Button stays disabled, and even a forced click is a no-op for whitespace.
    expect(screen.getByRole('button', { name: /Analyze Text/i })).toBeDisabled();
    expect(mockCanvasStore.createAndAnalyze).not.toHaveBeenCalled();
  });

  it('shows the analyzing state and disables inputs/button while analyzing', () => {
    mockCanvasStore.isAnalyzing = true;
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
