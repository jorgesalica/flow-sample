import type { Track } from './entities';

/**
 * Repository interface for Spotify tracks
 */
export interface TrackRepository {
  save(tracks: Track[]): Promise<void>;
  findAll(): Promise<Track[]>;
  findById(id: string): Promise<Track | null>;
  count(): Promise<number>;
}
