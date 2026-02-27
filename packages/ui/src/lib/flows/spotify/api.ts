import type { Track, PaginatedResult, SearchOptions } from '@flows/shared';
import {
  tracks,
  totalTracks,
  status,
  isLoading,
  searchOptions,
  topStats,
  isAuthenticated,
} from './stores';
import { get } from 'svelte/store';
import { api } from '@lib/client';
import { showError, showSuccess, showLoading, dismissToast } from '@lib/toast';

export async function loadTracks(
  options?: Partial<SearchOptions>,
  append: boolean = false
): Promise<void> {
  isLoading.set(true);

  const currentOptions = get(searchOptions);
  const newOptions = { ...currentOptions, ...options };
  searchOptions.set(newOptions);

  try {
    const { data, error } = await api.api.spotify.tracks.search.get({
      query: {
        page: newOptions.page,
        limit: newOptions.limit,
        q: newOptions.q,
        genre: newOptions.genre,
        year: newOptions.year,
        sortBy: newOptions.sortBy,
        sortOrder: newOptions.sortOrder,
      },
    });

    if (error) throw new Error('Failed to load tracks');

    const result = data as unknown as PaginatedResult<Track>;

    if (append) {
      tracks.update((current) => [...current, ...result.data]);
    } else {
      tracks.set(result.data);
    }
    totalTracks.set(result.total);

    // Update stats on initial load (no filters, page 1)
    if (!newOptions.q && !newOptions.genre && !newOptions.year && newOptions.page === 1) {
      updateStats();
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    showError(`Failed to load tracks: ${message}`);
    status.set({ message: 'Error loading tracks.', tone: 'error' });
  } finally {
    isLoading.set(false);
  }
}

export async function updateStats(): Promise<void> {
  try {
    const { data, error } = await api.api.spotify.stats.get();
    if (error) return;

    const stats = data as Record<string, unknown>;
    topStats.set({
      total: (stats.totalTracks as number) || 0,
      artists: 0,
      topGenre: (stats.topGenres as Array<{ genre: string }>)?.[0]?.genre || '—',
      genres: (stats.topGenres as Array<{ genre: string; count: number }>) || [],
      decadeDistribution: (stats.decadeDistribution as Record<string, number>) || {},
    });
  } catch {
    // Silent fail for stats - not critical
  }
}

let syncController: AbortController | null = null;
let syncToastId: string | undefined;

export function cancelSync() {
  if (syncController) {
    syncController.abort();
    syncController = null;
    isLoading.set(false);
    if (syncToastId) dismissToast(syncToastId);
    status.set({ message: 'Sync cancelled.', tone: 'info' });
  }
}

export async function fetchFromSpotify(): Promise<void> {
  if (syncController) syncController.abort();
  syncController = new AbortController();

  const toastId = showLoading('Syncing with Spotify...');
  syncToastId = toastId;
  status.set({ message: 'Fetching from Spotify...', tone: 'info' });
  isLoading.set(true);

  try {
    const { data, error } = await api.api.spotify.run.post({
      limit: 100,
    });

    if (error) throw new Error('Sync request failed');

    const result = data as { success: boolean; count: number; error?: string };
    if (!result.success) throw new Error(result.error || 'Request failed');

    dismissToast(toastId);
    showSuccess(`Synced ${result.count} tracks from Spotify!`);
    status.set({ message: `Fetch complete. ${result.count} tracks processed.`, tone: 'success' });

    // Reload everything
    searchOptions.set({ ...get(searchOptions), page: 1 });
    await loadTracks();
    await updateStats();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;

    dismissToast(toastId);
    const message = error instanceof Error ? error.message : 'Unknown error';
    showError(`Sync failed: ${message}`);
    status.set({ message: `Fetch failed: ${message}`, tone: 'error' });
  } finally {
    isLoading.set(false);
    syncController = null;
  }
}

export async function checkAuthStatus(): Promise<void> {
  try {
    const { data, error } = await api.api.spotify.auth.status.get();
    if (!error && data) {
      isAuthenticated.set((data as { connected: boolean }).connected);
    }
  } catch (e) {
    console.error('Failed to check auth status', e);
  }
}
