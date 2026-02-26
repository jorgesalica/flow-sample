import { writable } from 'svelte/store';
import type { Track, SearchOptions, TopStats, StatusMessage } from '@lib/types';

// Track Data
export const tracks = writable<Track[]>([]);
export const totalTracks = writable(0);

// Search & Filter State
export const searchOptions = writable<SearchOptions>({
  page: 1,
  limit: 24,
  q: '',
  sortBy: 'added_at',
  sortOrder: 'desc',
});

// UI State
export const status = writable<StatusMessage>({
  message: 'Ready to explore.',
  tone: 'info',
});
export const isLoading = writable(false);
export const isAuthenticated = writable(false);
export const topStats = writable<TopStats>({
  total: 0,
  artists: 0,
  topGenre: '—',
  genres: [],
  decadeDistribution: {},
});
