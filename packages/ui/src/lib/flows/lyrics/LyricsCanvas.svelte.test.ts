import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { CanvasAnalysis, LyricsCanvasNeedsAnalysisResponse } from '@flows/shared';
import type { InterpretEvent } from './api';
import LyricsCanvas from './LyricsCanvas.svelte';

// Mock both edges this component reaches through.
const getCanvasAnalysis = vi.fn();
const analyzeCanvas = vi.fn();
vi.mock('./canvas-api', () => ({
  getCanvasAnalysis: (...a: unknown[]) => getCanvasAnalysis(...a),
  analyzeCanvas: (...a: unknown[]) => analyzeCanvas(...a),
}));

const getLyrics = vi.fn();
const interpretLyrics = vi.fn();
vi.mock('./api', () => ({
  getLyrics: (...a: unknown[]) => getLyrics(...a),
  interpretLyrics: (...a: unknown[]) => interpretLyrics(...a),
}));

function makeAnalysis(overrides: Partial<CanvasAnalysis> = {}): CanvasAnalysis {
  return {
    id: 'canvas-1',
    sourceId: 'track-1',
    sourceType: 'track',
    sourceTextHash: 'hash',
    tokenAst: {
      sections: [
        {
          id: 's_001',
          type: 'Verse',
          lines: [
            [
              { id: 't_001', text: 'Hello' },
              { id: 't_002', text: 'world' },
            ],
          ],
        },
      ],
      totalTokens: 2,
    },
    annotations: [{ tokenId: 't_001', layerId: 'chords', label: 'Am', detail: 'A minor chord' }],
    layers: [{ id: 'chords', name: 'Chords', icon: '🎸', color: '#4ade80' }],
    meta: { key: 'A minor', bpm: 120, mood: 'melancholy' },
    modelUsed: 'm',
    providerUsed: 'p',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeNeedsAnalysis(): LyricsCanvasNeedsAnalysisResponse {
  return {
    needsAnalysis: true,
    source: {
      sourceId: 'track-1',
      sourceType: 'track',
      title: 'Test Title',
      author: 'Test Artist',
      imageUrl: 'https://img.example/cover.jpg',
    },
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('LyricsCanvas', () => {
  beforeEach(() => {
    getCanvasAnalysis.mockReset();
    analyzeCanvas.mockReset();
    getLyrics.mockReset();
    interpretLyrics.mockReset();
    // Default: no cached lyrics interpretation.
    getLyrics.mockResolvedValue(null);
  });

  it('shows a loading state while the analysis is being fetched', () => {
    getCanvasAnalysis.mockReturnValue(deferred().promise);
    getLyrics.mockReturnValue(deferred().promise);

    render(LyricsCanvas, { props: { trackId: 'track-1' } });

    expect(screen.getByRole('status')).toHaveTextContent('Loading canvas');
  });

  it('renders the needs-analysis state with a Generate Analysis button', async () => {
    getCanvasAnalysis.mockResolvedValue(makeNeedsAnalysis());

    render(LyricsCanvas, { props: { trackId: 'track-1' } });

    expect(await screen.findByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Analysis/ })).toBeInTheDocument();
  });

  it('renders an existing analysis: header, meta tags and tokens', async () => {
    getCanvasAnalysis.mockResolvedValue(makeAnalysis());

    render(LyricsCanvas, { props: { trackId: 'track-1' } });

    expect(await screen.findByText('Canvas Analysis')).toBeInTheDocument();
    expect(screen.getByText('Key: A minor')).toBeInTheDocument();
    expect(screen.getByText('120 BPM')).toBeInTheDocument();
    expect(screen.getByText('Mood: melancholy')).toBeInTheDocument();
    // Tokens rendered by the child TokenRenderer.
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('renders the layer toggle from analysis layers', async () => {
    getCanvasAnalysis.mockResolvedValue(makeAnalysis());

    render(LyricsCanvas, { props: { trackId: 'track-1' } });

    expect(await screen.findByRole('button', { name: /Chords/ })).toBeInTheDocument();
  });

  it('shows an error state with a Retry button when the fetch rejects', async () => {
    getCanvasAnalysis.mockRejectedValue(new Error('Canvas backend down'));

    render(LyricsCanvas, { props: { trackId: 'track-1' } });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Canvas unavailable');
    expect(alert).toHaveTextContent('Canvas backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('does NOT render analysis tokens while in the needs-analysis state (negative space)', async () => {
    getCanvasAnalysis.mockResolvedValue(makeNeedsAnalysis());

    render(LyricsCanvas, { props: { trackId: 'track-1' } });

    await screen.findByText('Test Title');
    expect(screen.queryByText('Canvas Analysis')).not.toBeInTheDocument();
  });

  it('generates an analysis when Generate Analysis is clicked', async () => {
    getCanvasAnalysis.mockResolvedValue(makeNeedsAnalysis());
    analyzeCanvas.mockResolvedValue(makeAnalysis());
    // interpretLyrics is fired-and-forgotten after analyze; keep it inert.
    interpretLyrics.mockImplementation(
      async (_id: string, onEvent: (e: InterpretEvent) => void) => {
        onEvent({ type: 'done' });
      }
    );

    render(LyricsCanvas, { props: { trackId: 'track-1' } });
    const generateBtn = await screen.findByRole('button', { name: /Generate Analysis/ });

    await fireEvent.click(generateBtn);

    expect(analyzeCanvas).toHaveBeenCalledWith('track-1');
    expect(await screen.findByText('Canvas Analysis')).toBeInTheDocument();
  });

  it('pre-fills the interpretation from a cached lyrics payload', async () => {
    getCanvasAnalysis.mockResolvedValue(makeAnalysis());
    getLyrics.mockResolvedValue({ interpretation: 'A meditation on memory.' });

    render(LyricsCanvas, { props: { trackId: 'track-1' } });

    expect(await screen.findByText('A meditation on memory.')).toBeInTheDocument();
  });

  it('offers a Generate Meaning button when no interpretation is cached', async () => {
    getCanvasAnalysis.mockResolvedValue(makeAnalysis());
    getLyrics.mockResolvedValue(null);

    render(LyricsCanvas, { props: { trackId: 'track-1' } });

    await screen.findByText('Canvas Analysis');
    expect(screen.getByText('No overarching meaning analysis found.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Meaning/ })).toBeInTheDocument();
  });

  it('generates the meaning from the empty interpretation state', async () => {
    getCanvasAnalysis.mockResolvedValue(makeAnalysis());
    getLyrics.mockResolvedValue(null);
    interpretLyrics.mockImplementation(
      async (_id: string, onEvent: (e: InterpretEvent) => void) => {
        onEvent({ type: 'cached', interpretation: 'A resolved meaning.' });
      }
    );

    render(LyricsCanvas, { props: { trackId: 'track-1' } });
    const generateBtn = await screen.findByRole('button', { name: 'Generate Meaning' });

    await fireEvent.click(generateBtn);

    expect(interpretLyrics).toHaveBeenCalledWith('track-1', expect.any(Function));
    expect(await screen.findByText('A resolved meaning.')).toBeInTheDocument();
  });
});
