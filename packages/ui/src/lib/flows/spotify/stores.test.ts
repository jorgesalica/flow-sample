import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  tracks,
  totalTracks,
  searchOptions,
  status,
  isLoading,
  isAuthenticated,
  topStats,
} from './stores';
import { makeTrack } from './test-fixtures';

describe('spotify stores', () => {
  beforeEach(() => {
    // Reset to documented defaults so order-independence holds.
    tracks.set([]);
    totalTracks.set(0);
    searchOptions.set({ page: 1, limit: 24, q: '', sortBy: 'added_at', sortOrder: 'desc' });
    status.set({ message: 'Ready to explore.', tone: 'info' });
    isLoading.set(false);
    isAuthenticated.set(false);
    topStats.set({ total: 0, artists: 0, topGenre: '—', genres: [], decadeDistribution: {} });
  });

  it('exposes the documented default search options', () => {
    expect(get(searchOptions)).toEqual({
      page: 1,
      limit: 24,
      q: '',
      sortBy: 'added_at',
      sortOrder: 'desc',
    });
  });

  it('starts empty with a zero total and an info status', () => {
    expect(get(tracks)).toEqual([]);
    expect(get(totalTracks)).toBe(0);
    expect(get(status)).toEqual({ message: 'Ready to explore.', tone: 'info' });
    expect(get(isLoading)).toBe(false);
    expect(get(isAuthenticated)).toBe(false);
  });

  it('appends tracks via update without dropping existing entries', () => {
    tracks.set([makeTrack({ id: 'a' })]);
    tracks.update((current) => [...current, makeTrack({ id: 'b' })]);

    expect(get(tracks).map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('carries the topStats shape through a set', () => {
    topStats.set({
      total: 3,
      artists: 0,
      topGenre: 'rock',
      genres: [{ genre: 'rock', count: 3 }],
      decadeDistribution: { '2020': 3 },
    });

    const stats = get(topStats);
    expect(stats.total).toBe(3);
    expect(stats.topGenre).toBe('rock');
    expect(stats.genres).toHaveLength(1);
    expect(stats.decadeDistribution).toEqual({ '2020': 3 });
  });
});
