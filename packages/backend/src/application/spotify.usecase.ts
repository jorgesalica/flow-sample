import type { Track, TrackRepository } from '../domain/flows/spotify';
import { logger } from './logger';

const log = logger.child({ module: 'SpotifyUseCase' });

export interface SpotifyUseCaseOptions {
  limit?: number;
  enrichGenres?: boolean;
}

/**
 * Artist details returned from Spotify API enrichment
 */
export interface ArtistDetails {
  genres: string[];
  imageUrl?: string;
}

/**
 * Interface for Spotify source that can fetch tracks and artist details
 */
export interface SpotifySourcePort {
  fetchTracks(limit?: number): Promise<Track[]>;
  fetchArtistDetails(artistIds: string[]): Promise<Map<string, ArtistDetails>>;
  // Legacy method for backwards compatibility
  fetchArtistGenres?(artistIds: string[]): Promise<Map<string, string[]>>;
}

export class SpotifyUseCase {
  constructor(
    private source: SpotifySourcePort,
    private repository: TrackRepository,
  ) { }

  async fetchAndSave(options: SpotifyUseCaseOptions = {}): Promise<{ count: number }> {
    const limit = options.limit ?? 20;
    const enrichGenres = options.enrichGenres ?? true;

    log.info({ limit, enrichGenres }, 'Fetching tracks from Spotify');

    let tracks = await this.source.fetchTracks(limit);
    log.info({ count: tracks.length }, 'Fetched tracks');

    // Enrich with artist details (genres + images) if requested
    if (enrichGenres && tracks.length > 0) {
      tracks = await this.enrichTracksWithArtistDetails(tracks);
    }

    await this.repository.save(tracks);
    log.info('Saved tracks to repository');

    // Rebuild FTS index for search
    const { rebuildFtsIndex } = await import('../infrastructure/persistence/sqlite/database');
    rebuildFtsIndex();
    log.info('Rebuilt FTS search index');

    return { count: tracks.length };
  }

  private async enrichTracksWithArtistDetails(tracks: Track[]): Promise<Track[]> {
    // Collect all unique artist IDs
    const artistIds = [...new Set(tracks.flatMap((t) => t.artists.map((a) => a.id)))];
    log.info({ artistCount: artistIds.length }, 'Enriching artist details (genres + images)');

    // Fetch details from Spotify (genres + images)
    const detailsMap = await this.source.fetchArtistDetails(artistIds);
    log.info({ enrichedCount: detailsMap.size }, 'Fetched artist details');

    // Map details back to tracks
    return tracks.map((track) => ({
      ...track,
      artists: track.artists.map((artist) => {
        const details = detailsMap.get(artist.id);
        return {
          ...artist,
          genres: details?.genres || [],
          imageUrl: details?.imageUrl,
        };
      }),
    }));
  }

  async getTracks(): Promise<Track[]> {
    return this.repository.findAll();
  }

  async getTrackCount(): Promise<number> {
    return this.repository.count();
  }
}
