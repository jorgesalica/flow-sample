import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpotifyTopStats, Track } from '@flows/shared';

const mocks = vi.hoisted(() => ({
  searchGet: vi.fn(),
  statsGet: vi.fn(),
  runPost: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showLoading: vi.fn(() => 'toast-1'),
  dismissToast: vi.fn(),
  invalidateData: vi.fn(),
  store: {
    isLoading: false,
    searchOptions: {
      page: 1,
      limit: 24,
      q: '',
      sortBy: 'added_at' as const,
      sortOrder: 'desc' as const,
    },
    tracks: [] as Track[],
    totalTracks: 0,
    topStats: null,
    status: null,
    appendTracks: vi.fn(),
  },
}));

vi.mock('@lib/client', () => ({
  api: {
    api: {
      spotify: {
        tracks: { search: { get: mocks.searchGet } },
        stats: { get: mocks.statsGet },
        run: { post: mocks.runPost },
      },
    },
  },
}));
vi.mock('./stores.svelte', () => ({ spotifyStore: mocks.store }));
vi.mock('@lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
  showLoading: mocks.showLoading,
  dismissToast: mocks.dismissToast,
}));
vi.mock('@lib/invalidate', () => ({ invalidateData: mocks.invalidateData }));
vi.mock('@lib/invalidation', () => ({
  INVALIDATION: { SPOTIFY_LIBRARY: 'app:spotify-library' },
}));

const { fetchFromSpotify, loadTracks, mapTopStats, updateStats } = await import('./api');

const track: Track = {
  id: 'track-1',
  title: 'A Song',
  artists: [{ id: 'artist-1', name: 'An Artist' }],
  album: { id: 'album-1', name: 'An Album', releaseDate: '2020-01-01' },
  addedAt: '2026-01-01T00:00:00.000Z',
  durationMs: 180000,
};

const stats: SpotifyTopStats = {
  totalTracks: 1,
  totalGenres: 1,
  topGenres: [{ genre: 'rock', count: 1 }],
  decadeDistribution: { '2020s': 1 },
  yearRange: { oldest: 2020, newest: 2020 },
};

describe('Spotify API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.isLoading = false;
    mocks.store.searchOptions = {
      page: 1,
      limit: 24,
      q: '',
      sortBy: 'added_at',
      sortOrder: 'desc',
    };
    mocks.store.tracks = [];
    mocks.store.totalTracks = 0;
    mocks.store.topStats = null;
    mocks.store.status = null;
  });

  it('maps the typed backend stats contract', () => {
    expect(mapTopStats(stats)).toEqual({
      total: 1,
      artists: 0,
      topGenre: 'rock',
      genres: [{ genre: 'rock', count: 1 }],
      decadeDistribution: { '2020s': 1 },
    });
  });

  it('loads typed paginated tracks without response casts', async () => {
    mocks.searchGet.mockResolvedValue({
      data: { data: [track], total: 1, page: 1, limit: 24, totalPages: 1 },
      error: null,
    });

    await loadTracks({ q: 'song' });

    expect(mocks.store.tracks).toEqual([track]);
    expect(mocks.store.totalTracks).toBe(1);
    expect(mocks.searchGet).toHaveBeenCalledWith({
      query: expect.objectContaining({ q: 'song' }),
    });
  });

  it('updates stats from the inferred response', async () => {
    mocks.statsGet.mockResolvedValue({ data: stats, error: null });

    await updateStats();

    expect(mocks.store.topStats).toEqual(expect.objectContaining({ total: 1 }));
  });

  it('syncs and invalidates the library through typed data', async () => {
    mocks.runPost.mockResolvedValue({
      data: { success: true, message: 'Flow completed.', count: 7 },
      error: null,
    });

    await fetchFromSpotify();

    expect(mocks.runPost).toHaveBeenCalledWith(
      { limit: 100 },
      { fetch: { signal: expect.any(AbortSignal) } }
    );
    expect(mocks.showSuccess).toHaveBeenCalledWith('Synced 7 tracks from Spotify!');
    expect(mocks.invalidateData).toHaveBeenCalledWith('app:spotify-library');
  });
});
