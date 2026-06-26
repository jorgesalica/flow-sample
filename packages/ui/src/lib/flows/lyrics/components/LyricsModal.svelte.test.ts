import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import type { Track } from '@flows/shared';
import type { InterpretEvent } from '../api';
import LyricsModal from './LyricsModal.svelte';

// Mock the flow's data edge so no network is hit.
const getLyrics = vi.fn();
const interpretLyrics = vi.fn();
vi.mock('../api', () => ({
  getLyrics: (...args: unknown[]) => getLyrics(...args),
  interpretLyrics: (...args: unknown[]) => interpretLyrics(...args),
}));

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'track-1',
    title: 'Bohemian Rhapsody',
    artists: [{ id: 'a1', name: 'Queen', genres: [] }],
    album: {
      id: 'al1',
      name: 'A Night at the Opera',
      releaseDate: '1975',
      imageUrl: 'https://img.example/cover.jpg',
    },
    addedAt: '2024-01-01T00:00:00.000Z',
    durationMs: 354000,
    ...overrides,
  } as Track;
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('LyricsModal', () => {
  beforeEach(() => {
    getLyrics.mockReset();
    interpretLyrics.mockReset();
  });

  it('renders track title and artist in the header', async () => {
    getLyrics.mockResolvedValue({ plainLyrics: 'Is this the real life?', status: 'found' });

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });

    expect(await screen.findByText('Bohemian Rhapsody')).toBeInTheDocument();
    expect(screen.getByText('Queen')).toBeInTheDocument();
  });

  it('shows a loading state while lyrics are being fetched', () => {
    getLyrics.mockReturnValue(deferred().promise); // never resolves

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });

    expect(screen.getByText('Fetching lyrics...')).toBeInTheDocument();
  });

  it('renders the lyrics content on success', async () => {
    getLyrics.mockResolvedValue({ plainLyrics: 'Is this the real life?', status: 'found' });

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });

    expect(await screen.findByText('Is this the real life?')).toBeInTheDocument();
  });

  it('shows a not-found state with a retry button when status is not_found', async () => {
    getLyrics.mockResolvedValue({ plainLyrics: null, status: 'not_found' });

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });

    expect(await screen.findByText('No lyrics found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Retrieval' })).toBeInTheDocument();
  });

  it('shows an error state with a retry button when the fetch rejects', async () => {
    getLyrics.mockRejectedValue(new Error('Network down'));

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });

    expect(await screen.findByText('Failed to load lyrics')).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('does NOT render lyrics content while in the error state (negative space)', async () => {
    getLyrics.mockRejectedValue(new Error('Network down'));

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });

    await screen.findByText('Failed to load lyrics');
    expect(screen.queryByText('Is this the real life?')).not.toBeInTheDocument();
  });

  it('calls onclose when the close button is clicked', async () => {
    getLyrics.mockResolvedValue({ plainLyrics: 'hi', status: 'found' });
    const onclose = vi.fn();

    render(LyricsModal, { props: { track: makeTrack(), onclose } });
    await screen.findByText('hi');

    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('calls onclose when Escape is pressed', async () => {
    getLyrics.mockResolvedValue({ plainLyrics: 'hi', status: 'found' });
    const onclose = vi.fn();

    render(LyricsModal, { props: { track: makeTrack(), onclose } });
    await screen.findByText('hi');

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('shows an Interpret button when lyrics are present and not yet interpreting', async () => {
    getLyrics.mockResolvedValue({ plainLyrics: 'words', status: 'found' });

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });

    expect(await screen.findByRole('button', { name: 'Interpret' })).toBeInTheDocument();
  });

  it('does NOT show an Interpret button for a not_found track (negative space)', async () => {
    getLyrics.mockResolvedValue({ plainLyrics: null, status: 'not_found' });

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });

    await screen.findByText('No lyrics found');
    expect(screen.queryByRole('button', { name: 'Interpret' })).not.toBeInTheDocument();
  });

  it('streams interpretation deltas into the panel when Interpret is clicked', async () => {
    getLyrics.mockResolvedValue({ plainLyrics: 'words', status: 'found' });
    interpretLyrics.mockImplementation(
      async (_id: string, onEvent: (e: InterpretEvent) => void) => {
        onEvent({ type: 'delta', delta: 'A song about ' });
        onEvent({ type: 'delta', delta: 'freedom.' });
        onEvent({ type: 'done' });
      }
    );

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });
    const interpretBtn = await screen.findByRole('button', { name: 'Interpret' });

    await fireEvent.click(interpretBtn);

    expect(await screen.findByText('AI Interpretation')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/A song about freedom\./)).toBeInTheDocument();
    });
  });

  it('shows a cached interpretation automatically when present in the lyrics payload', async () => {
    getLyrics.mockResolvedValue({
      plainLyrics: 'words',
      status: 'found',
      interpretation: 'Cached meaning text.',
    });

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });

    expect(await screen.findByText('Cached meaning text.')).toBeInTheDocument();
    expect(screen.getByText('AI Interpretation')).toBeInTheDocument();
  });

  it('renders an interpretation error returned by the stream', async () => {
    getLyrics.mockResolvedValue({ plainLyrics: 'words', status: 'found' });
    interpretLyrics.mockImplementation(
      async (_id: string, onEvent: (e: InterpretEvent) => void) => {
        onEvent({ type: 'error', error: 'LLM unavailable' });
      }
    );

    render(LyricsModal, { props: { track: makeTrack(), onclose: vi.fn() } });
    await fireEvent.click(await screen.findByRole('button', { name: 'Interpret' }));

    expect(await screen.findByText('LLM unavailable')).toBeInTheDocument();
  });
});
