import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import type { LyricsStats } from '@flows/shared';
import LyricsFlow from './LyricsFlow.svelte';

// Mock the flow's data edge.
const getLyricsStats = vi.fn();
const getLyricsLibrary = vi.fn();
const fetchAllLyrics = vi.fn();
const getLyrics = vi.fn();
vi.mock('./api', () => ({
  getLyricsStats: (...a: unknown[]) => getLyricsStats(...a),
  getLyricsLibrary: (...a: unknown[]) => getLyricsLibrary(...a),
  fetchAllLyrics: (...a: unknown[]) => fetchAllLyrics(...a),
  getLyrics: (...a: unknown[]) => getLyrics(...a),
}));

// Mock toast so no real toaster machinery runs. `vi.hoisted` keeps the object
// in scope for the hoisted `vi.mock` factory below.
const toast = vi.hoisted(() => ({
  loading: vi.fn(() => 'toast-id'),
  dismiss: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@lib/toast', () => ({ toast }));

// LyricsCanvas reaches its own edges; stub it so the flow's canvas branch is
// observable without driving the real canvas component.
vi.mock('./LyricsCanvas.svelte', async () => {
  const Stub = (await import('./__fixtures__/CanvasStub.svelte')).default;
  return { default: Stub };
});

function makeStats(overrides: Partial<LyricsStats> = {}): LyricsStats {
  return { total: 10, found: 6, notFound: 2, pending: 2, ...overrides };
}

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'track-1',
    title: 'Test Title',
    artist: 'Test Artist',
    imageUrl: 'https://img.example/cover.jpg',
    status: 'found',
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('LyricsFlow', () => {
  beforeEach(() => {
    getLyricsStats.mockReset();
    getLyricsLibrary.mockReset();
    fetchAllLyrics.mockReset();
    getLyrics.mockReset();
    toast.loading.mockClear();
    toast.dismiss.mockClear();
    toast.success.mockClear();
    toast.error.mockClear();
    // Reset URL between tests (the component reads/writes location).
    window.history.replaceState(null, '', '/lyrics');
  });

  it('shows the loading state while initial data loads', () => {
    getLyricsStats.mockReturnValue(deferred().promise);
    getLyricsLibrary.mockReturnValue(deferred().promise);

    render(LyricsFlow);

    expect(screen.getByText('Loading lyrics data...')).toBeInTheDocument();
  });

  it('renders the stats grid and the tracks table on success', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow(), makeRow({ id: 'track-2', title: 'Second' })]);

    render(LyricsFlow);

    // Stats values.
    expect(await screen.findByText('Total Tracks')).toBeInTheDocument();
    expect(screen.getByText('Recent Tracks')).toBeInTheDocument();
    // Rows.
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    // "2 loaded" counter.
    expect(screen.getByText('2 loaded')).toBeInTheDocument();
  });

  it('shows the empty state when no tracks are returned', async () => {
    getLyricsStats.mockResolvedValue(makeStats({ total: 0, found: 0, notFound: 0, pending: 0 }));
    getLyricsLibrary.mockResolvedValue([]);

    render(LyricsFlow);

    expect(await screen.findByText('No tracks found')).toBeInTheDocument();
    expect(
      screen.getByText('Try changing the filter or fetching more lyrics.')
    ).toBeInTheDocument();
  });

  it('shows the error state when the initial load fails', async () => {
    getLyricsStats.mockRejectedValue(new Error('Backend exploded'));
    getLyricsLibrary.mockRejectedValue(new Error('Backend exploded'));

    render(LyricsFlow);

    expect(await screen.findByText('Error Loading Data')).toBeInTheDocument();
    expect(screen.getByText('Backend exploded')).toBeInTheDocument();
  });

  it('does NOT render the stats grid while in the error state (negative space)', async () => {
    getLyricsStats.mockRejectedValue(new Error('boom'));
    getLyricsLibrary.mockRejectedValue(new Error('boom'));

    render(LyricsFlow);

    await screen.findByText('Error Loading Data');
    expect(screen.queryByText('Recent Tracks')).not.toBeInTheDocument();
  });

  it('renders a percentage in the Found stat card', async () => {
    getLyricsStats.mockResolvedValue(makeStats({ total: 10, found: 5 }));
    getLyricsLibrary.mockResolvedValue([makeRow()]);

    render(LyricsFlow);

    // 5 / 10 = 50%.
    expect(await screen.findByText('50%')).toBeInTheDocument();
  });

  it('reloads with a status filter when the filter dropdown changes', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);

    render(LyricsFlow);
    await screen.findByText('Recent Tracks');

    getLyricsLibrary.mockClear();
    const select = screen.getByRole('combobox');
    await fireEvent.change(select, { target: { value: 'not_found' } });

    await waitFor(() => {
      expect(getLyricsLibrary).toHaveBeenCalledWith(1, 50, 'not_found');
    });
  });

  it('runs a batch fetch and shows a success toast when Fetch Missing is clicked', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);
    fetchAllLyrics.mockResolvedValue({ processed: 3, found: 2, notFound: 1, errors: 0 });

    render(LyricsFlow);
    await screen.findByText('Recent Tracks');

    await fireEvent.click(screen.getByRole('button', { name: /Fetch Missing/ }));

    await waitFor(() => {
      expect(fetchAllLyrics).toHaveBeenCalledWith(false);
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Sync Complete: 2 found, 1 not available.');
    });
  });

  it('reports errors in the batch-fetch result via an error toast', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);
    fetchAllLyrics.mockResolvedValue({ processed: 5, found: 3, notFound: 1, errors: 1 });

    render(LyricsFlow);
    await screen.findByText('Recent Tracks');

    await fireEvent.click(screen.getByRole('button', { name: /Fetch Missing/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Sync Complete: 3 found, 1 not available. (1 errors)'
      );
    });
  });

  it('shows a "nothing to process" success when batch fetch processes zero', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);
    fetchAllLyrics.mockResolvedValue({ processed: 0, found: 0, notFound: 0, errors: 0 });

    render(LyricsFlow);
    await screen.findByText('Recent Tracks');

    await fireEvent.click(screen.getByRole('button', { name: /Fetch Missing/ }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('No tracks needed processing.');
    });
  });

  it('shows an error toast when the batch fetch rejects', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);
    fetchAllLyrics.mockRejectedValue(new Error('batch failed'));

    render(LyricsFlow);
    await screen.findByText('Recent Tracks');

    await fireEvent.click(screen.getByRole('button', { name: /Fetch Missing/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch lyrics batch');
    });
  });

  it('opens the modal with the track when a found row is clicked', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow({ title: 'Clickable Song' })]);
    // The modal mounts and fetches lyrics for the track.
    getLyrics.mockResolvedValue({ plainLyrics: 'la la la', status: 'found' });

    render(LyricsFlow);
    const row = await screen.findByText('Clickable Song');

    await fireEvent.click(row);

    // Modal heading uses the same title; appears once table cell + once modal.
    await waitFor(() => {
      expect(getLyrics).toHaveBeenCalledWith('track-1', { force: false });
    });
  });

  it('opens the canvas view when a found row Open Canvas button is clicked', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);

    render(LyricsFlow);
    await screen.findByText('Recent Tracks');

    await fireEvent.click(screen.getByRole('button', { name: 'Open Canvas' }));

    expect(await screen.findByText('Back to Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-stub')).toHaveTextContent('track-1');
  });

  it('restores the canvas view from a canvasTrackId URL param on mount', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);
    window.history.replaceState(null, '', '/lyrics?canvasTrackId=track-99');

    render(LyricsFlow);

    expect(await screen.findByText('Back to Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-stub')).toHaveTextContent('track-99');
  });

  it('returns to the dashboard from the canvas view', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);
    window.history.replaceState(null, '', '/lyrics?canvasTrackId=track-99');

    render(LyricsFlow);
    await screen.findByText('Back to Dashboard');

    await fireEvent.click(screen.getByText('Back to Dashboard'));

    expect(await screen.findByText('Recent Tracks')).toBeInTheDocument();
  });

  it('retries an individual not_found track and flips it to found on success', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow({ status: 'not_found' })]);
    getLyrics.mockResolvedValue({ plainLyrics: 'found now', status: 'found' });

    render(LyricsFlow);
    await screen.findByText('Recent Tracks');

    // The not_found row shows a single "Retry Fetching" action button.
    await fireEvent.click(screen.getByRole('button', { name: 'Retry Fetching' }));

    await waitFor(() => {
      expect(getLyrics).toHaveBeenCalledWith('track-1', { force: true });
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Fetch complete');
    });
  });

  it('marks an individual track not_found and toasts on a failed retry', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow({ status: 'pending' })]);
    getLyrics.mockRejectedValue(new Error('not found'));

    render(LyricsFlow);
    await screen.findByText('Recent Tracks');

    await fireEvent.click(screen.getByRole('button', { name: 'Fetch Lyrics' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fetch failed or not found');
    });
  });
});
