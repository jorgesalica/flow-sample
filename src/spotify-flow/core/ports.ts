import { Track } from './types';

export interface SourcePort {
    /**
     * Fetches tracks from the source.
     * @param limit Optional limit on number of tracks to fetch.
     */
    fetchTracks(limit?: number): Promise<Track[]>;

    /**
     * Enriches tracks with additional metadata (e.g. genres).
     * @param tracks The tracks to enrich.
     */
    enrichTracks(tracks: Track[]): Promise<Track[]>;
}

export interface StoragePort {
    /**
     * Saves data to the storage.
     * @param key Unique key for the data (e.g. 'raw_tracks').
     * @param data The data to save.
     */
    save(key: string, data: unknown): Promise<void>;

    /**
     * Loads data from the storage.
     * @param key Unique key for the data.
     */
    load<T>(key: string): Promise<T | null>;

    /**
     * Checks if data exists.
     */
    exists(key: string): Promise<boolean>;
}
