import type { Track } from '@flows/shared';
import type { TrackRepository } from '@flows/shared';
import { logger } from '@flows/core';
import { rebuildFtsIndex } from '@flows/music';
import type { ArtistDetails, SpotifySourcePort } from '../domain/ports';

export type { ArtistDetails, SpotifySourcePort } from '../domain/ports';

const log = logger.child({ module: 'SpotifyUseCase' });

export interface SpotifyUseCaseOptions {
  limit?: number;
  enrichGenres?: boolean;
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
    log.info({
      requested: artistIds.length,
      received: detailsMap.size
    }, 'Batch enrichment summary');

    // Map details back to tracks
    return tracks.map((track) => ({
      ...track,
      artists: track.artists.map((artist) => {
        const details = detailsMap.get(artist.id);

        if (!details) {
          log.warn({ artistId: artist.id, artistName: artist.name }, 'No enrichment data for artist');
          return artist; // Keep original if no details found
        }

        // Merge original with enriched details, but don't wipe name or id
        return {
          ...artist,
          genres: details.genres && details.genres.length > 0 ? details.genres : (artist.genres || []),
          imageUrl: details.imageUrl || artist.imageUrl,
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
