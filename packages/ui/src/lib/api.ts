import type { Track, PaginatedResult, SearchOptions } from './types';
import { tracks, totalTracks, status, isLoading, searchOptions, topStats } from './stores';
import { get } from 'svelte/store';
import { ENDPOINTS } from './config';

export async function loadTracks(options?: Partial<SearchOptions>, append: boolean = false): Promise<void> {
    isLoading.set(true);

    // Merge current options with new ones
    const currentOptions = get(searchOptions);
    const newOptions = { ...currentOptions, ...options };
    searchOptions.set(newOptions);

    // Build query params
    const params = new URLSearchParams();
    if (newOptions.page) params.set('page', newOptions.page.toString());
    if (newOptions.limit) params.set('limit', newOptions.limit.toString());
    if (newOptions.q) params.set('q', newOptions.q);
    if (newOptions.genre) params.set('genre', newOptions.genre);
    if (newOptions.year) params.set('year', newOptions.year.toString());
    if (newOptions.minPopularity) params.set('minPopularity', newOptions.minPopularity.toString());
    if (newOptions.sortBy) params.set('sortBy', newOptions.sortBy);
    if (newOptions.sortOrder) params.set('sortOrder', newOptions.sortOrder);

    try {
        const res = await fetch(`${ENDPOINTS.TRACKS_SEARCH}?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);

        const data: PaginatedResult<Track> = await res.json();

        if (append) {
            tracks.update(current => [...current, ...data.data]);
        } else {
            tracks.set(data.data);
        }
        totalTracks.set(data.total);

        // Also update stats if we're on the first page and no filters are active (initial load)
        if (!newOptions.q && !newOptions.genre && !newOptions.year && newOptions.page === 1) {
            updateStats();
        }

    } catch (error) {
        console.error(error);
        status.set({ message: 'Error loading tracks.', tone: 'error' });
    } finally {
        isLoading.set(false);
    }
}

export async function updateStats(): Promise<void> {
    try {
        const res = await fetch(ENDPOINTS.STATS);
        if (res.ok) {
            const data = await res.json();
            topStats.set({
                total: data.totalTracks,
                artists: 0, // Not provided directly in summary stats object
                topGenre: data.topGenres?.[0]?.genre || '—'
            });
        }
    } catch {
        // Silent fail for stats
    }
}

export async function fetchFromSpotify(): Promise<void> {
    status.set({ message: 'Fetching from Spotify...', tone: 'info' });
    isLoading.set(true);

    try {
        const res = await fetch(ENDPOINTS.SPOTIFY_RUN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 100 }), // Fetch more by default
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Request failed');
        }

        status.set({ message: `Fetch complete. ${data.count} tracks processed.`, tone: 'success' });

        // Reload everything
        searchOptions.set({ ...get(searchOptions), page: 1 });
        await loadTracks();
        await updateStats();

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        status.set({ message: `Fetch failed: ${message}`, tone: 'error' });
    } finally {
        isLoading.set(false);
    }
}
