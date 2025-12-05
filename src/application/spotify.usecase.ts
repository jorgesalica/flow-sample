import type { Track, TrackRepository } from '../domain/flows/spotify';
import type { SourcePort } from '../domain/shared';
import { logger } from './logger';

const log = logger.child({ module: 'SpotifyUseCase' });

export interface SpotifyUseCaseOptions {
  limit?: number;
}

export class SpotifyUseCase {
  constructor(
    private source: SourcePort,
    private repository: TrackRepository,
  ) {}

  async fetchAndSave(options: SpotifyUseCaseOptions = {}): Promise<{ count: number }> {
    const limit = options.limit ?? 20;
    log.info({ limit }, 'Fetching tracks from Spotify');

    const tracks = await this.source.fetchTracks(limit);
    log.info({ count: tracks.length }, 'Fetched tracks');

    await this.repository.save(tracks);
    log.info('Saved tracks to repository');

    return { count: tracks.length };
  }

  async getTracks(): Promise<Track[]> {
    return this.repository.findAll();
  }

  async getTrackCount(): Promise<number> {
    return this.repository.count();
  }
}
