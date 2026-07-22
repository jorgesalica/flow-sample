/**
 * Spotify Flow Types
 */

export interface Artist {
  id: string;
  name: string;
  genres?: string[];
  imageUrl?: string;
}

export interface Album {
  id: string;
  name: string;
  releaseDate: string;
  releaseYear?: number;
  imageUrl?: string;
}

export interface Track {
  id: string;
  title: string;
  artists: Artist[];
  album: Album;
  addedAt: string;
  durationMs: number;
  previewUrl?: string;
  spotifyUrl?: string;
}

// Aggregation types
export interface GenreCount {
  genre: string;
  count: number;
}

export interface YearCount {
  year: number;
  count: number;
}

export interface SpotifyTopStats {
  totalTracks: number;
  totalGenres: number;
  topGenres: GenreCount[];
  decadeDistribution: Record<string, number>;
  yearRange: {
    oldest: number;
    newest: number;
  } | null;
}

export interface SpotifyAuthStatus {
  connected: boolean;
}

export interface SpotifySyncResponse {
  success: true;
  message: string;
  count: number;
}

export interface SpotifyErrorResponse {
  error: string;
  retryAfterSeconds?: number;
}

// Repository interface (shared contract between Spotify and Lyrics flows)
export interface TrackRepository {
  save(tracks: Track[]): Promise<void>;
  findAll(): Promise<Track[]>;
  findById(id: string): Promise<Track | null>;
  count(): Promise<number>;
  getGenres(): Promise<GenreCount[]>;
  getYears(): Promise<YearCount[]>;
}
