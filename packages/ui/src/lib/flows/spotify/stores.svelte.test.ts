import { describe, it, expect, beforeEach } from 'vitest';
import { spotifyStore } from './stores.svelte';
import { makeTrack } from './test-fixtures';

describe('spotify store (runes)', () => {
  beforeEach(() => {
    // Reset to documented defaults so order-independence holds.
    spotifyStore.tracks = [];
    spotifyStore.totalTracks = 0;
    spotifyStore.searchOptions = {
      page: 1,
      limit: 24,
      q: '',
      sortBy: 'added_at',
      sortOrder: 'desc',
    };
    spotifyStore.status = { message: 'Ready to explore.', tone: 'info' };
    spotifyStore.isLoading = false;
    spotifyStore.isAuthenticated = false;
    spotifyStore.topStats = {
      total: 0,
      artists: 0,
      topGenre: '—',
      genres: [],
      decadeDistribution: {},
    };
  });

  it('exposes the documented default search options', () => {
    expect(spotifyStore.searchOptions).toEqual({
      page: 1,
      limit: 24,
      q: '',
      sortBy: 'added_at',
      sortOrder: 'desc',
    });
  });

  it('starts empty with a zero total and an info status', () => {
    expect(spotifyStore.tracks).toEqual([]);
    expect(spotifyStore.totalTracks).toBe(0);
    expect(spotifyStore.status).toEqual({ message: 'Ready to explore.', tone: 'info' });
    expect(spotifyStore.isLoading).toBe(false);
    expect(spotifyStore.isAuthenticated).toBe(false);
  });

  it('appends tracks via appendTracks without dropping existing entries', () => {
    spotifyStore.tracks = [makeTrack({ id: 'a' })];
    spotifyStore.appendTracks([makeTrack({ id: 'b' })]);

    expect(spotifyStore.tracks.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('carries the topStats shape through a set', () => {
    spotifyStore.topStats = {
      total: 3,
      artists: 0,
      topGenre: 'rock',
      genres: [{ genre: 'rock', count: 3 }],
      decadeDistribution: { '2020': 3 },
    };

    const stats = spotifyStore.topStats;
    expect(stats.total).toBe(3);
    expect(stats.topGenre).toBe('rock');
    expect(stats.genres).toHaveLength(1);
    expect(stats.decadeDistribution).toEqual({ '2020': 3 });
  });
});
