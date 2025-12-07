import type { Track, GenreCount, YearCount } from './entities';

/**
 * Repository interface for Spotify tracks
 */
export interface TrackRepository {
  save(tracks: Track[]): Promise<void>;
  findAll(): Promise<Track[]>;
  findById(id: string): Promise<Track | null>;
  count(): Promise<number>;
  getGenres(): Promise<GenreCount[]>;
  getYears(): Promise<YearCount[]>;
}

