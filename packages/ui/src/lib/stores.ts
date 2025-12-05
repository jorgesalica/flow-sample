import { writable } from 'svelte/store';
import type { Track, SearchOptions } from './types';

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
export const status = writable<{ message: string; tone: 'info' | 'success' | 'warning' | 'error' }>(
    { message: 'Ready to explore.', tone: 'info' }
);
export const isLoading = writable(false);
export const topStats = writable<{ total: number; artists: number; topGenre: string }>({
    total: 0,
    artists: 0,
    topGenre: '—',
});
