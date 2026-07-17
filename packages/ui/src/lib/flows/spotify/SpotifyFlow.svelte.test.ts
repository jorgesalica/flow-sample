import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { Track, SearchOptions } from '@flows/shared';
import type { TopStats } from '@lib/types';

const loadTracks = vi.fn();
const replaceState = vi.hoisted(() => vi.fn());

vi.mock('$app/navigation', () => ({ replaceState }));

// Mock the flow's interactive API edge; route data is loader-owned.
// Initial tracks, stats, options, and auth arrive through loader props.
vi.mock('./api', () => ({
  loadTracks: (...args: unknown[]) => loadTracks(...args),
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
import { spotifyStore } from './stores.svelte';
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

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  page: 1,
  limit: 24,
  q: '',
  sortBy: 'added_at',
  sortOrder: 'desc',
};

const EMPTY_STATS: TopStats = {
  total: 0,
  artists: 0,
  topGenre: '—',
  genres: [],
  decadeDistribution: {},
};

function resetStore() {
  spotifyStore.tracks = [];
  spotifyStore.totalTracks = 0;
  spotifyStore.isLoading = false;
  spotifyStore.searchOptions = { ...DEFAULT_SEARCH_OPTIONS };
  spotifyStore.topStats = { ...EMPTY_STATS };
}

// Default props mirror what the loader provides; individual tests override as needed.
function props(
  overrides: Partial<{
    tracks: Track[];
    totalTracks: number;
    searchOptions: SearchOptions;
    topStats: TopStats;
  }> = {}
) {
  return {
    tracks: [],
    totalTracks: 0,
    searchOptions: { ...DEFAULT_SEARCH_OPTIONS },
    topStats: { ...EMPTY_STATS },
    ...overrides,
  };
}

describe('SpotifyFlow render states', () => {
  beforeEach(() => {
    resetStore();
    loadTracks.mockClear();
    replaceState.mockReset();
  });

  it('hydrates auth from loader props and does not refetch tracks', async () => {
    render(SpotifyFlow, { props: { ...props(), isAuthenticated: true } });

    await waitFor(() => expect(spotifyStore.isAuthenticated).toBe(true));
    expect(loadTracks).not.toHaveBeenCalled();
  });

  it('hydrates the store from the loaded props', () => {
    render(SpotifyFlow, {
      props: props({
        tracks: [makeTrack({ id: 't1', title: 'First Song' })],
        totalTracks: 1,
      }),
    });

    expect(spotifyStore.tracks.map((t) => t.id)).toEqual(['t1']);
    expect(spotifyStore.totalTracks).toBe(1);
  });

  it('always renders the header and footer chrome', () => {
    render(SpotifyFlow, { props: props() });

    expect(screen.getByRole('heading', { name: 'Spotify Flow' })).toBeInTheDocument();
    expect(screen.getByText('Flow Sample - Spotify')).toBeInTheDocument();
  });

  it('shows the shared loading state when loading with no tracks yet', () => {
    // Drive the loading state via the runes store before render (no tracks yet).
    spotifyStore.isLoading = true;
    render(SpotifyFlow, { props: props() });

    expect(screen.getByRole('status')).toHaveTextContent('Loading your library');
    expect(screen.queryByText(/no tracks found/i)).not.toBeInTheDocument();
  });

  it('shows the empty state with a clear-filters action when not loading and no tracks', () => {
    render(SpotifyFlow, { props: props() });

    expect(screen.getByRole('status')).toHaveTextContent('No tracks found');
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });

  it('clears all search and filter options from the empty state', async () => {
    render(SpotifyFlow, { props: props() });

    await fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }));

    expect(loadTracks).toHaveBeenCalledWith({
      page: 1,
      limit: 24,
      q: '',
      genre: undefined,
      year: undefined,
      sortBy: 'added_at',
      sortOrder: 'desc',
    });
  });

  it('renders a track card per track in the data state', async () => {
    render(SpotifyFlow, {
      props: props({
        tracks: [
          makeTrack({ id: 't1', title: 'First Song' }),
          makeTrack({ id: 't2', title: 'Second Song' }),
        ],
        totalTracks: 2,
      }),
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'First Song' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Second Song' })).toBeInTheDocument();
    // Negative space: no empty-state message when there is data.
    expect(screen.queryByText(/no tracks found/i)).not.toBeInTheDocument();
  });

  it('reflects header stats from the loaded topStats', () => {
    // genres left empty on purpose so the InsightsPanel chart branch (chart.js)
    // stays unmounted — the header reads total/topGenre independently.
    render(SpotifyFlow, {
      props: props({
        topStats: {
          total: 99,
          artists: 0,
          topGenre: 'shoegaze',
          genres: [],
          decadeDistribution: {},
        },
      }),
    });

    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('shoegaze')).toBeInTheDocument();
  });
});
