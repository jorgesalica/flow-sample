import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Track } from '@flows/shared';

const tracksSearchGet = vi.fn();
const statsGet = vi.fn();

// Mock the typed Eden client the loader calls for its initial fetch.
vi.mock('@lib/client', () => ({
  api: {
    api: {
      spotify: {
        tracks: { search: { get: (...args: unknown[]) => tracksSearchGet(...args) } },
        stats: { get: (...args: unknown[]) => statsGet(...args) },
      },
    },
  },
}));
// Keep the toast re-export (pulled in transitively via api.ts) inert.
vi.mock('@lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showLoading: vi.fn(),
  dismissToast: vi.fn(),
}));

import { load, type SpotifyPageData } from './+page';
import { makeTrack } from '@lib/flows/spotify/test-fixtures';

const TRACK: Track = makeTrack({ id: 't1', title: 'First Song' });

const STATS_PAYLOAD = {
  totalTracks: 42,
  topGenres: [
    { genre: 'rock', count: 12 },
    { genre: 'pop', count: 5 },
  ],
  decadeDistribution: { '2020': 30, '2010': 12 },
};

// Minimal LoadEvent stub — the loader takes no arguments off the event.
const event = {} as Parameters<typeof load>[0];

describe('spotify +page loader', () => {
  beforeEach(() => {
    tracksSearchGet.mockReset();
    statsGet.mockReset();
  });

  it('queries the first page with default search options', async () => {
    tracksSearchGet.mockResolvedValue({ data: { data: [], total: 0 }, error: null });
    statsGet.mockResolvedValue({ data: STATS_PAYLOAD, error: null });

    await load(event);

    expect(tracksSearchGet).toHaveBeenCalledWith({
      query: {
        page: 1,
        limit: 24,
        q: '',
        genre: undefined,
        year: undefined,
        sortBy: 'added_at',
        sortOrder: 'desc',
      },
    });
  });

  it('returns the loaded tracks, total, default search options, and mapped stats', async () => {
    tracksSearchGet.mockResolvedValue({ data: { data: [TRACK], total: 1 }, error: null });
    statsGet.mockResolvedValue({ data: STATS_PAYLOAD, error: null });

    const result = (await load(event)) as SpotifyPageData;

    expect(result.tracks).toEqual([TRACK]);
    expect(result.totalTracks).toBe(1);
    expect(result.searchOptions).toEqual({
      page: 1,
      limit: 24,
      q: '',
      sortBy: 'added_at',
      sortOrder: 'desc',
    });
    expect(result.topStats).toEqual({
      total: 42,
      artists: 0,
      topGenre: 'rock',
      genres: STATS_PAYLOAD.topGenres,
      decadeDistribution: STATS_PAYLOAD.decadeDistribution,
    });
  });

  it('falls back to empty tracks when the tracks fetch errors', async () => {
    tracksSearchGet.mockResolvedValue({ data: null, error: { status: 500 } });
    statsGet.mockResolvedValue({ data: STATS_PAYLOAD, error: null });

    const result = (await load(event)) as SpotifyPageData;

    expect(result.tracks).toEqual([]);
    expect(result.totalTracks).toBe(0);
    // Stats still load independently of the tracks failure.
    expect(result.topStats.total).toBe(42);
  });

  it('falls back to empty stats when the stats fetch errors', async () => {
    tracksSearchGet.mockResolvedValue({ data: { data: [TRACK], total: 1 }, error: null });
    statsGet.mockResolvedValue({ data: null, error: { status: 500 } });

    const result = (await load(event)) as SpotifyPageData;

    // Tracks still load independently of the stats failure.
    expect(result.tracks).toEqual([TRACK]);
    expect(result.topStats).toEqual({
      total: 0,
      artists: 0,
      topGenre: '—',
      genres: [],
      decadeDistribution: {},
    });
  });

  it('survives a thrown tracks request and still returns stats', async () => {
    tracksSearchGet.mockRejectedValue(new Error('network down'));
    statsGet.mockResolvedValue({ data: STATS_PAYLOAD, error: null });

    const result = (await load(event)) as SpotifyPageData;

    expect(result.tracks).toEqual([]);
    expect(result.totalTracks).toBe(0);
    expect(result.topStats.total).toBe(42);
  });
});
