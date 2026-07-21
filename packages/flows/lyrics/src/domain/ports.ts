import type {
  LyricsLibraryTrack,
  LyricsStats,
  LyricsStatus,
} from '@flows/shared';

/**
 * Lyrics payload to persist for a track.
 */
export interface LyricsData {
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

/**
 * A persisted lyrics record hydrated from storage.
 */
export interface LyricsRecord {
  trackId: string;
  plainLyrics: string | null;
  syncedLyrics: string | null;
  status: LyricsStatus;
  fetchedAt: string | null;
  interpretation: string | null;
}

/**
 * Result of fetching lyrics from an external source.
 */
export interface LyricsResult {
  plainLyrics: string | null;
  syncedLyrics: string | null;
  instrumental: boolean;
}

/**
 * Parameters describing a single track to fetch lyrics for in a batch.
 */
export interface LyricsTrackParams {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  durationSeconds: number;
}

/**
 * Outcome of fetching lyrics for one track inside a batch.
 */
export interface BatchLyricsResult {
  trackId: string;
  result: LyricsResult | null;
  error?: string;
}

/**
 * Port for persisting and querying lyrics.
 */
export interface LyricsRepository {
  findByTrackId(trackId: string): Promise<LyricsRecord | null>;
  save(trackId: string, lyrics: LyricsData): Promise<void>;
  markNotFound(trackId: string): Promise<void>;
  getPendingTrackIds(includeFailed?: boolean): Promise<string[]>;
  getStats(): Promise<LyricsStats>;
  getLibraryWithStatus(
    limit?: number,
    offset?: number,
    statusFilter?: LyricsStatus,
  ): Promise<LyricsLibraryTrack[]>;
  getInterpretation(trackId: string): Promise<string | null>;
  saveInterpretation(trackId: string, interpretation: string): Promise<void>;
}

/**
 * Port for fetching lyrics from an external source.
 */
export interface LyricsSource {
  fetchLyrics(params: {
    trackName: string;
    artistName: string;
    albumName: string;
    durationSeconds: number;
  }): Promise<LyricsResult | null>;
  fetchLyricsBatch(
    tracks: LyricsTrackParams[],
    onProgress?: (completed: number, total: number) => void,
    concurrency?: number,
  ): Promise<BatchLyricsResult[]>;
}
