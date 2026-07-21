import type { SearchOptions, SpotifyTopStats } from '@flows/shared';
import type { TopStats } from '@lib/types';
import { spotifyStore } from './stores.svelte';
import { api } from '@lib/client';
import { showError, showSuccess, showLoading, dismissToast } from '@lib/toast';
import { invalidateData } from '@lib/invalidate';
import { INVALIDATION } from '@lib/invalidation';

export function mapTopStats(stats: SpotifyTopStats): TopStats {
  return {
    total: stats.totalTracks,
    artists: 0,
    topGenre: stats.topGenres[0]?.genre ?? '—',
    genres: stats.topGenres,
    decadeDistribution: stats.decadeDistribution,
  };
}

export async function loadTracks(
  options?: Partial<SearchOptions>,
  append: boolean = false
): Promise<void> {
  spotifyStore.isLoading = true;

  const currentOptions = spotifyStore.searchOptions;
  const newOptions = { ...currentOptions, ...options };
  spotifyStore.searchOptions = newOptions;

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

    if (error || !data) throw new Error('Failed to load tracks');

    if (append) {
      spotifyStore.appendTracks(data.data);
    } else {
      spotifyStore.tracks = data.data;
    }
    spotifyStore.totalTracks = data.total;

    if (!newOptions.q && !newOptions.genre && !newOptions.year && newOptions.page === 1) {
      updateStats();
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    showError(`Failed to load tracks: ${message}`);
    spotifyStore.status = { message: 'Error loading tracks.', tone: 'error' };
  } finally {
    spotifyStore.isLoading = false;
  }
}

export async function updateStats(): Promise<void> {
  try {
    const { data, error } = await api.api.spotify.stats.get();
    if (error || !data) return;
    spotifyStore.topStats = mapTopStats(data);
  } catch {
    // Stats are non-critical for the library workflow.
  }
}

let syncController: AbortController | null = null;
let syncToastId: string | undefined;

export function cancelSync() {
  if (syncController) {
    syncController.abort();
    syncController = null;
    spotifyStore.isLoading = false;
    if (syncToastId) dismissToast(syncToastId);
    spotifyStore.status = { message: 'Sync cancelled.', tone: 'info' };
  }
}

export async function fetchFromSpotify(): Promise<void> {
  if (syncController) syncController.abort();
  syncController = new AbortController();

  const toastId = showLoading('Syncing with Spotify...');
  syncToastId = toastId;
  spotifyStore.status = { message: 'Fetching from Spotify...', tone: 'info' };
  spotifyStore.isLoading = true;

  try {
    const { data, error } = await api.api.spotify.run.post(
      { limit: 100 },
      { fetch: { signal: syncController.signal } }
    );
    if (error || !data) throw new Error('Sync request failed');

    dismissToast(toastId);
    showSuccess(`Synced ${data.count} tracks from Spotify!`);
    spotifyStore.status = {
      message: `Fetch complete. ${data.count} tracks processed.`,
      tone: 'success',
    };

    spotifyStore.searchOptions = { ...spotifyStore.searchOptions, page: 1 };
    await invalidateData(INVALIDATION.SPOTIFY_LIBRARY);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;

    dismissToast(toastId);
    const message = error instanceof Error ? error.message : 'Unknown error';
    showError(`Sync failed: ${message}`);
    spotifyStore.status = { message: `Fetch failed: ${message}`, tone: 'error' };
  } finally {
    spotifyStore.isLoading = false;
    syncController = null;
    syncToastId = undefined;
  }
}
