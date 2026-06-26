import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import type { LyricsStats } from '@flows/shared';
import type { LyricsPageData, LyricsTrackRow } from '../../../routes/lyrics/+page';
import LyricsFlow from './LyricsFlow.svelte';

// Mock the flow's data edge. The INITIAL stats + first page now arrive via the
// loader (passed in as the `data` prop); these mocks back the interactive
// re-fetches that stay in the component (filtering, load-more, refresh, retry).
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

function makeRow(overrides: Partial<LyricsTrackRow> = {}): LyricsTrackRow {
  return {
    id: 'track-1',
    title: 'Test Title',
    artist: 'Test Artist',
    imageUrl: 'https://img.example/cover.jpg',
    status: 'found',
    ...overrides,
  };
}

// Build the loader payload the component now consumes as its `data` prop.
function makeData(overrides: Partial<LyricsPageData> = {}): LyricsPageData {
  return {
    stats: makeStats(),
    tracks: [makeRow()],
    canvasTrackId: null,
    error: null,
    ...overrides,
  };
}

// Render the flow with loaded data already in hand (mirrors what +page.ts feeds).
function renderFlow(data: LyricsPageData = makeData()) {
  return render(LyricsFlow, { props: { data } });
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

  it('shows the loading state while a re-fetch is in flight with no rows yet', async () => {
    // A filter reset clears rows and flips into the loading branch; hold the
    // library fetch open so the spinner stays visible.
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockReturnValue(deferred<LyricsTrackRow[]>().promise);

    renderFlow();
    await screen.findByText('Recent Tracks');

    await fireEvent.change(screen.getByRole('combobox'), { target: { value: 'not_found' } });

    expect(await screen.findByText('Loading lyrics data...')).toBeInTheDocument();
  });

  it('renders the stats grid and the tracks table from loaded data', async () => {
    renderFlow(
      makeData({
        tracks: [makeRow(), makeRow({ id: 'track-2', title: 'Second' })],
      })
    );

    // Stats values.
    expect(await screen.findByText('Total Tracks')).toBeInTheDocument();
    expect(screen.getByText('Recent Tracks')).toBeInTheDocument();
    // Rows.
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    // "2 loaded" counter.
    expect(screen.getByText('2 loaded')).toBeInTheDocument();
  });

  it('shows the empty state when the loaded data has no tracks', async () => {
    renderFlow(
      makeData({
        stats: makeStats({ total: 0, found: 0, notFound: 0, pending: 0 }),
        tracks: [],
      })
    );

    expect(await screen.findByText('No tracks found')).toBeInTheDocument();
    expect(
      screen.getByText('Try changing the filter or fetching more lyrics.')
    ).toBeInTheDocument();
  });

  it('shows the error state when the loader reports a failure', async () => {
    renderFlow(makeData({ stats: null, tracks: [], error: 'Backend exploded' }));

    expect(await screen.findByText('Error Loading Data')).toBeInTheDocument();
    expect(screen.getByText('Backend exploded')).toBeInTheDocument();
  });

  it('does NOT render the stats grid while in the error state (negative space)', async () => {
    renderFlow(makeData({ stats: null, tracks: [], error: 'boom' }));

    await screen.findByText('Error Loading Data');
    expect(screen.queryByText('Recent Tracks')).not.toBeInTheDocument();
  });

  it('renders a percentage in the Found stat card', async () => {
    renderFlow(makeData({ stats: makeStats({ total: 10, found: 5 }) }));

    // 5 / 10 = 50%.
    expect(await screen.findByText('50%')).toBeInTheDocument();
  });

  it('reloads with a status filter when the filter dropdown changes', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);

    renderFlow();
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

    renderFlow();
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

    renderFlow();
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

    renderFlow();
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

    renderFlow();
    await screen.findByText('Recent Tracks');

    await fireEvent.click(screen.getByRole('button', { name: /Fetch Missing/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch lyrics batch');
    });
  });

  it('opens the modal with the track when a found row is clicked', async () => {
    // The modal mounts and fetches lyrics for the track.
    getLyrics.mockResolvedValue({ plainLyrics: 'la la la', status: 'found' });

    renderFlow(makeData({ tracks: [makeRow({ title: 'Clickable Song' })] }));
    const row = await screen.findByText('Clickable Song');

    await fireEvent.click(row);

    // Modal heading uses the same title; appears once table cell + once modal.
    await waitFor(() => {
      expect(getLyrics).toHaveBeenCalledWith('track-1', { force: false });
    });
  });

  it('opens the canvas view when a found row Open Canvas button is clicked', async () => {
    renderFlow();
    await screen.findByText('Recent Tracks');

    await fireEvent.click(screen.getByRole('button', { name: 'Open Canvas' }));

    expect(await screen.findByText('Back to Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-stub')).toHaveTextContent('track-1');
  });

  it('restores the canvas view from a canvasTrackId provided by the loader', async () => {
    renderFlow(makeData({ canvasTrackId: 'track-99' }));

    expect(await screen.findByText('Back to Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-stub')).toHaveTextContent('track-99');
  });

  it('returns to the dashboard from the canvas view', async () => {
    renderFlow(makeData({ canvasTrackId: 'track-99' }));
    await screen.findByText('Back to Dashboard');

    await fireEvent.click(screen.getByText('Back to Dashboard'));

    expect(await screen.findByText('Recent Tracks')).toBeInTheDocument();
  });

  it('retries an individual not_found track and flips it to found on success', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyrics.mockResolvedValue({ plainLyrics: 'found now', status: 'found' });

    renderFlow(makeData({ tracks: [makeRow({ status: 'not_found' })] }));
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
    getLyrics.mockRejectedValue(new Error('not found'));

    renderFlow(makeData({ tracks: [makeRow({ status: 'pending' })] }));
    await screen.findByText('Recent Tracks');

    await fireEvent.click(screen.getByRole('button', { name: 'Fetch Lyrics' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fetch failed or not found');
    });
  });
});
