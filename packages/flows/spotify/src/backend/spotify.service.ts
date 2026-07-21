import { SimpleCache, logger } from '@flows/core';
import { SQLiteTrackRepository } from '@flows/music';
import type {
  GenreCount,
  PaginatedResult,
  SearchOptions,
  SpotifyAuthStatus,
  SpotifySyncResponse,
  SpotifyTopStats,
  Track,
  YearCount,
} from '@flows/shared';
import type {
  SpotifyCache,
  SpotifyGateway,
  SpotifyTokenRepository,
  SpotifyTrackRepository,
} from '../domain/ports';
import { SpotifyApiAdapter } from './adapter';
import type { SpotifyRuntimeConfig, SpotifyRoutesConfig } from './config';
import { calculateStats } from './stats.service';
import { SQLiteTokenRepository } from './token.repository';
import { SpotifyUseCase } from './usecase';

const log = logger.child({ module: 'SpotifyService' });
const CACHE_KEYS = {
  GENRES: 'genres',
  YEARS: 'years',
  STATS: 'stats',
} as const;

export interface SpotifySyncApplication {
  fetchAndSave(options?: { limit?: number }): Promise<{ count: number }>;
  getTracks(): Promise<Track[]>;
  getTrackCount(): Promise<number>;
}

export interface SpotifyApplication {
  getAuthorizationUrl(): string;
  getSuccessUrl(): string;
  exchangeCode(code: string): Promise<void>;
  getAuthStatus(): SpotifyAuthStatus;
  sync(limit?: number): Promise<SpotifySyncResponse>;
  getTracks(): Promise<Track[]>;
  searchTracks(options: SearchOptions): Promise<PaginatedResult<Track>>;
  getTrack(trackId: string): Promise<Track | null>;
  getTrackCount(): Promise<number>;
  getGenres(): Promise<GenreCount[]>;
  getYears(): Promise<YearCount[]>;
  getStats(): Promise<SpotifyTopStats>;
}

export interface SpotifyServiceDependencies {
  repository?: SpotifyTrackRepository;
  tokenRepository?: SpotifyTokenRepository;
  gateway?: SpotifyGateway;
  syncApplication?: SpotifySyncApplication;
  cache?: SpotifyCache;
}

export class SpotifyService implements SpotifyApplication {
  constructor(
    private readonly config: SpotifyRuntimeConfig,
    private readonly gateway: SpotifyGateway,
    private readonly syncApplication: SpotifySyncApplication,
    private readonly repository: SpotifyTrackRepository,
    private readonly tokenRepository: SpotifyTokenRepository,
    private readonly cache: SpotifyCache,
  ) {}

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: 'user-library-read user-read-email',
      redirect_uri: this.config.redirectUri,
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  getSuccessUrl(): string {
    return this.config.successUrl;
  }

  exchangeCode(code: string): Promise<void> {
    return this.gateway.exchangeCode(code);
  }

  getAuthStatus(): SpotifyAuthStatus {
    return { connected: this.tokenRepository.get('spotify:refresh_token') !== null };
  }

  async sync(limit = this.config.pageLimit): Promise<SpotifySyncResponse> {
    const result = await this.syncApplication.fetchAndSave({ limit });
    this.cache.invalidateAll();
    log.info({ count: result.count }, 'Cache invalidated after Spotify sync');
    return {
      success: true,
      message: 'Flow completed.',
      count: result.count,
    };
  }

  getTracks(): Promise<Track[]> {
    return this.syncApplication.getTracks();
  }

  searchTracks(options: SearchOptions): Promise<PaginatedResult<Track>> {
    return this.repository.findPaginated({
      page: options.page,
      limit: options.limit,
      query: options.q,
      genre: options.genre,
      year: options.year,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    });
  }

  getTrack(trackId: string): Promise<Track | null> {
    return this.repository.findById(trackId);
  }

  getTrackCount(): Promise<number> {
    return this.syncApplication.getTrackCount();
  }

  getGenres(): Promise<GenreCount[]> {
    return this.withCache(CACHE_KEYS.GENRES, () => this.repository.getGenres());
  }

  getYears(): Promise<YearCount[]> {
    return this.withCache(CACHE_KEYS.YEARS, () => this.repository.getYears());
  }

  getStats(): Promise<SpotifyTopStats> {
    return this.withCache(CACHE_KEYS.STATS, () => calculateStats(this.repository));
  }

  private async withCache<T>(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.cache.get<T>(key);
    if (cached !== null) {
      log.debug({ key }, 'Cache hit');
      return cached;
    }

    const value = await load();
    this.cache.set(key, value);
    return value;
  }
}

export function createSpotifyService(
  config: SpotifyRoutesConfig,
  dependencies: SpotifyServiceDependencies = {},
): SpotifyService {
  const repository = dependencies.repository ?? new SQLiteTrackRepository();
  const tokenRepository = dependencies.tokenRepository ?? new SQLiteTokenRepository();
  const gateway =
    dependencies.gateway ??
    new SpotifyApiAdapter(
      {
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
        redirectUri: config.spotify.redirectUri,
        refreshToken: config.spotify.refreshToken,
      },
      tokenRepository,
    );
  const syncApplication =
    dependencies.syncApplication ?? new SpotifyUseCase(gateway, repository);

  return new SpotifyService(
    config.spotify,
    gateway,
    syncApplication,
    repository,
    tokenRepository,
    dependencies.cache ?? new SimpleCache(),
  );
}
