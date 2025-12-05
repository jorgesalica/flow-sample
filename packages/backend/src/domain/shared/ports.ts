import type { Track } from '../flows/spotify';

/**
 * Port for fetching tracks from external source
 */
export interface SourcePort {
  fetchTracks(limit?: number): Promise<Track[]>;
}

/**
 * Port for persisting tracks
 */
export interface StoragePort {
  saveTracks(tracks: Track[]): Promise<void>;
  loadTracks(): Promise<Track[] | null>;
}
