import type { GenreCount, PaginatedResult, Track, TrackRepository, YearCount } from '@flows/shared';

/**
 * Port for fetching tracks from external source
 */
export interface SourcePort {
  fetchTracks(limit?: number): Promise<Track[]>;
}

export interface ArtistDetails {
  genres: string[];
  imageUrl?: string;
}

export interface SpotifySourcePort extends SourcePort {
  fetchArtistDetails(artistIds: string[]): Promise<Map<string, ArtistDetails>>;
  fetchArtistGenres?(artistIds: string[]): Promise<Map<string, string[]>>;
}

export interface SpotifyGateway extends SpotifySourcePort {
  exchangeCode(code: string): Promise<void>;
}

export interface SpotifyTokenRepository {
  get(key: string): string | null;
  set(key: string, value: string, expiresAt: number): void;
}

export interface SpotifyTrackSearch {
  page?: number;
  limit?: number;
  query?: string;
  genre?: string;
  year?: number;
  sortBy?: 'added_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SpotifyTrackRepository extends TrackRepository {
  findPaginated(options?: SpotifyTrackSearch): Promise<PaginatedResult<Track>>;
  getGenres(): Promise<GenreCount[]>;
  getYears(): Promise<YearCount[]>;
}

export interface SpotifyCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  invalidateAll(): void;
}

/**
 * Port for persisting tracks
 */
export interface StoragePort {
  saveTracks(tracks: Track[]): Promise<void>;
  loadTracks(): Promise<Track[] | null>;
}
