import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const loadTracks = vi.fn();
const checkAuthStatus = vi.fn();

// Mock the flow's api edge: SpotifyFlow's onMount fires loadTracks + checkAuthStatus.
// We drive the render states by setting the real stores directly.
vi.mock('./api', () => ({
  loadTracks: (...args: unknown[]) => loadTracks(...args),
  checkAuthStatus: (...args: unknown[]) => checkAuthStatus(...args),
  // Re-exported indirectly by child components we also have to satisfy.
  fetchFromSpotify: vi.fn(),
  cancelSync: vi.fn(),
}));
vi.mock('@lib/client', () => ({ api: {} }));
// Child components reach the lyrics api when a card mounts; keep it inert.
vi.mock('@lib/flows/lyrics/api', () => ({
  getLyrics: vi.fn().mockResolvedValue({ plainLyrics: null, status: 'not_found' }),
  interpretLyrics: vi.fn().mockResolvedValue(undefined),
}));

import SpotifyFlow from './SpotifyFlow.svelte';
import { tracks, totalTracks, isLoading, topStats, searchOptions } from './stores';
import { makeTrack } from './test-fixtures';

beforeAll(() => {
  // jsdom lacks IntersectionObserver, used by InfiniteScroll (data state only).
  if (!('IntersectionObserver' in globalThis)) {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    // @ts-expect-error test polyfill
    globalThis.IntersectionObserver = IO;
  }
});

function resetStores() {
  tracks.set([]);
  totalTracks.set(0);
  isLoading.set(false);
  searchOptions.set({ page: 1, limit: 24, q: '', sortBy: 'added_at', sortOrder: 'desc' });
  topStats.set({ total: 0, artists: 0, topGenre: '—', genres: [], decadeDistribution: {} });
}

describe('SpotifyFlow render states', () => {
  beforeEach(() => {
    resetStores();
    loadTracks.mockClear();
    checkAuthStatus.mockClear();
  });

  it('loads tracks and checks auth on mount', () => {
    render(SpotifyFlow);

    expect(checkAuthStatus).toHaveBeenCalledOnce();
    expect(loadTracks).toHaveBeenCalledWith({ page: 1 });
  });

  it('always renders the header and footer chrome', () => {
    render(SpotifyFlow);

    expect(screen.getByRole('heading', { name: 'Spotify Flow' })).toBeInTheDocument();
    expect(screen.getByText('Cosmic Flow — Spotify Edition')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading with no tracks yet', () => {
    isLoading.set(true);
    tracks.set([]);
    const { container } = render(SpotifyFlow);

    // Eight skeleton placeholders, and no empty-state message while loading.
    expect(container.querySelectorAll('.skeleton')).toHaveLength(8);
    expect(screen.queryByText(/no tracks found/i)).not.toBeInTheDocument();
  });

  it('shows the empty state with a clear-filters action when not loading and no tracks', () => {
    isLoading.set(false);
    tracks.set([]);
    render(SpotifyFlow);

    expect(screen.getByText(/no tracks found matching your filters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });

  it('renders a track card per track in the data state', async () => {
    tracks.set([
      makeTrack({ id: 't1', title: 'First Song' }),
      makeTrack({ id: 't2', title: 'Second Song' }),
    ]);
    totalTracks.set(2);
    render(SpotifyFlow);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'First Song' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Second Song' })).toBeInTheDocument();
    // Negative space: no empty-state message when there is data.
    expect(screen.queryByText(/no tracks found/i)).not.toBeInTheDocument();
  });

  it('reflects header stats from the topStats store', () => {
    // genres left empty on purpose so the InsightsPanel chart branch (chart.js)
    // stays unmounted — the header reads total/topGenre independently.
    topStats.set({
      total: 99,
      artists: 0,
      topGenre: 'shoegaze',
      genres: [],
      decadeDistribution: {},
    });
    render(SpotifyFlow);

    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('shoegaze')).toBeInTheDocument();
  });
});
