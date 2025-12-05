import type { Track } from './types';
import { tracks, status, isLoading } from './stores';
import { ENDPOINTS } from './config';

export async function loadSavedData(): Promise<void> {
    status.set({ message: 'Loading saved data...', tone: 'info' });
    isLoading.set(true);

    try {
        const res = await fetch(ENDPOINTS.LIKED_SONGS, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data: Track[] = await res.json();
        tracks.set(data);
        status.set({ message: `Loaded ${data.length} tracks.`, tone: 'success' });
    } catch (error) {
        console.error(error);
        status.set({ message: 'No saved data. Click "Fetch" to export.', tone: 'warning' });
    } finally {
        isLoading.set(false);
    }
}

export async function fetchFromSpotify(): Promise<void> {
    status.set({ message: 'Fetching from Spotify...', tone: 'info' });
    isLoading.set(true);

    try {
        const res = await fetch(ENDPOINTS.SPOTIFY_RUN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Request failed');
        }

        status.set({ message: 'Fetch complete.', tone: 'success' });
        await loadSavedData();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        status.set({ message: `Fetch failed: ${message}`, tone: 'error' });
    } finally {
        isLoading.set(false);
    }
}
