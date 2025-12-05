import { Track } from './types';

export interface SourcePort {
    /**
     * Fetches tracks from the source.
     * @param limit Number of pages to fetch.
     */
    fetchTracks(limit?: number): Promise<Track[]>;
}

export interface StoragePort {
    /**
     * Saves tracks to storage.
     */
    saveTracks(tracks: Track[]): Promise<void>;

    /**
     * Loads tracks from storage.
     */
    loadTracks(): Promise<Track[] | null>;
}
