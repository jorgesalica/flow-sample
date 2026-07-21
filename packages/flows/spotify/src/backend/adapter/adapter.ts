import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { SpotifyGateway, SpotifyTokenRepository } from '../../domain/ports';
import type { Track } from '@flows/shared';
import { SpotifyAuthError, SpotifyRateLimitError } from '../../domain/errors';
import type {
  SpotifySavedTrack,
  SpotifyPaging,
  SpotifyTokenResponse,
  SpotifyArtistFull,
} from './types.js';
import { logger } from '@flows/core';
import { ArtistCacheRepository } from '../artist-cache.repository';

const log = logger.child({ module: 'SpotifyApiAdapter' });

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
}

export class SpotifyApiAdapter implements SpotifyGateway {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenRepository?: SpotifyTokenRepository;
  private artistCache: ArtistCacheRepository;

  constructor(
    private config: SpotifyConfig,
    tokenRepository?: SpotifyTokenRepository,
  ) {
    this.tokenRepository = tokenRepository;
    this.artistCache = new ArtistCacheRepository();
    this.client = axios.create({
      baseURL: 'https://api.spotify.com/v1',
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const status = error.response?.status;
        const originalRequest = error.config as typeof error.config & {
          _retry?: boolean;
          _retryCount?: number;
        };

        // Handle rate limiting with auto-retry
        if (status === 429) {
          const retryAfter = parseInt((error.response?.headers?.['retry-after'] as string) || '5');
          const retryCount = originalRequest?._retryCount || 0;
          const maxRetries = 3;

          if (retryCount < maxRetries && originalRequest) {
            originalRequest._retryCount = retryCount + 1;
            log.warn(
              { retryAfter, attempt: retryCount + 1, maxRetries },
              'Rate limited by Spotify, retrying...',
            );

            // Wait for the specified time
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

            return this.client(originalRequest);
          }

          // Max retries exceeded
          throw new SpotifyRateLimitError(retryAfter);
        }

        if (status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await this.refreshAccessToken();
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${this.accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            throw new SpotifyAuthError(
              `Token refresh failed: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`,
            );
          }
        }

        if (status === 401) {
          throw new SpotifyAuthError('Unauthorized');
        }

        return Promise.reject(error);
      },
    );
  }

  private async refreshAccessToken(): Promise<void> {
    // 1. Try to get refresh token from DB, fallback to config
    const dbRefreshToken = this.tokenRepository?.get('spotify:refresh_token');
    const refreshToken = dbRefreshToken || this.config.refreshToken;

    if (!refreshToken) {
      throw new SpotifyAuthError('No refresh token provided');
    }

    const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64',
    );

    try {
      const response: AxiosResponse<SpotifyTokenResponse> = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      this.saveTokens(response.data);
    } catch (error) {
      if (error instanceof SpotifyAuthError) throw error;
      throw new SpotifyAuthError('Failed to refresh access token');
    }
  }

  async exchangeCode(code: string): Promise<void> {
    const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64',
    );

    try {
      const response: AxiosResponse<SpotifyTokenResponse> = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
        }),
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      this.saveTokens(response.data);
    } catch (error) {
      log.error({ error }, 'Failed to exchange code');
      throw new SpotifyAuthError('Failed to exchange code');
    }
  }

  private saveTokens(tokenData: SpotifyTokenResponse): void {
    if (!this.tokenRepository || !this.accessToken) return;
    const expiresAt = Date.now() + (tokenData.expires_in - 60) * 1000;
    this.tokenRepository.set('spotify:access_token', this.accessToken, expiresAt);
    if (tokenData.refresh_token) {
      this.tokenRepository.set(
        'spotify:refresh_token',
        tokenData.refresh_token,
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      );
    }
  }

  async fetchTracks(limit: number = 20): Promise<Track[]> {
    if (!this.accessToken) await this.refreshAccessToken();

    log.info({ pageLimit: limit }, 'Fetching liked tracks from Spotify');
    const tracks: Track[] = [];
    let nextUrl: string | null = '/me/tracks?limit=50';
    let page = 1;

    while (nextUrl && page <= limit) {
      const response: AxiosResponse<SpotifyPaging<SpotifySavedTrack>> =
        await this.client.get(nextUrl);
      const data = response.data;

      const pageTracks = data.items.map((item) => {
        try {
          return this.mapToTrack(item);
        } catch (e) {
          log.error({ error: e instanceof Error ? e.message : String(e) }, 'Failed to map track');
          return null;
        }
      }).filter((t): t is Track => t !== null);

      tracks.push(...pageTracks);

      nextUrl = data.next ? data.next.replace('https://api.spotify.com/v1', '') : null;
      page++;
    }

    log.info({ trackCount: tracks.length, pagesFetched: page - 1 }, 'Fetched liked tracks');
    return tracks;
  }

  private mapToTrack(item: SpotifySavedTrack): Track {
    const t = item.track;
    if (!t) {
      throw new Error('Track object is missing in Spotify response');
    }

    // Get the medium-sized image (300x300) or fallback to first available
    const albumImage = t.album?.images?.find((img) => img.width === 300) || t.album?.images?.[0];

    if (!t.artists || t.artists.length === 0) {
      log.warn({ trackId: t.id, trackName: t.name }, 'Track has no artists listed');
    }

    return {
      id: t.id || `local-${t.name}-${t.album?.name}`.replace(/\s+/g, '-'), // Fallback for local files
      title: t.name || 'Unknown Title',
      artists: (t.artists || []).map((a) => ({
        id: a.id || `local-artist-${a.name}`.replace(/\s+/g, '-'),
        name: a.name || 'Unknown Artist'
      })),
      album: {
        id: t.album?.id || '',
        name: t.album?.name || 'Unknown Album',
        releaseDate: t.album?.release_date || '',
        releaseYear: t.album?.release_date ? parseInt(t.album.release_date.split('-')[0]) : undefined,
        imageUrl: albumImage?.url,
      },
      addedAt: item.added_at,
      durationMs: t.duration_ms || 0,
      previewUrl: t.preview_url || undefined,
      spotifyUrl: t.id ? `https://open.spotify.com/track/${t.id}` : undefined,
    };
  }

  /**
   * Fetch genres and images for a list of artist IDs.
   * Uses SQLite cache first, then fetches misses individually via GET /artists/{id}.
   * (Feb 2026 migration: batch GET /artists was removed)
   */
  async fetchArtistDetails(
    artistIds: string[],
  ): Promise<Map<string, { genres: string[]; imageUrl?: string }>> {
    if (!this.accessToken) await this.refreshAccessToken();

    const detailsMap = new Map<string, { genres: string[]; imageUrl?: string }>();
    const uniqueIds = [...new Set(artistIds)];

    // 1. Check cache first
    const { cached, misses } = this.artistCache.getMany(uniqueIds);
    for (const [id, entry] of cached) {
      detailsMap.set(id, { genres: entry.genres, imageUrl: entry.imageUrl });
    }

    if (misses.length === 0) {
      log.info({ artistCount: uniqueIds.length, allCached: true }, 'All artist details from cache');
      return detailsMap;
    }

    log.info(
      { total: uniqueIds.length, cached: cached.size, toFetch: misses.length },
      'Fetching uncached artist details individually',
    );

    // 2. Fetch misses individually — conservative to avoid 429s
    //    First sync is slow (~10 min for 2000+ artists) but subsequent syncs are instant from cache.
    const concurrency = 2;
    const delayMs = 500;
    let fetched = 0;

    for (let i = 0; i < misses.length; i += concurrency) {
      const batch = misses.slice(i, i + concurrency);

      const results = await Promise.allSettled(
        batch.map(async (id) => {
          const response: AxiosResponse<SpotifyArtistFull> = await this.client.get(
            `/artists/${id}`,
          );
          return response.data;
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const artist = result.value;
          const image =
            artist.images?.find((img) => img.width === 160) || artist.images?.[0];
          const genres = artist.genres || [];
          const imageUrl = image?.url;

          detailsMap.set(artist.id, { genres, imageUrl });
          this.artistCache.set(artist.id, genres, imageUrl);
          fetched++;
        }
      }

      // Progress logging every 50 artists
      if (fetched % 50 < concurrency && fetched > 0) {
        log.info(
          { fetched, total: misses.length, pct: Math.round((fetched / misses.length) * 100) },
          'Artist fetch progress',
        );
      }

      // Respectful delay between requests
      if (i + concurrency < misses.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    log.info({ enrichedCount: detailsMap.size }, 'Fetched artist details');
    return detailsMap;
  }

  // Backwards compatibility
  async fetchArtistGenres(artistIds: string[]): Promise<Map<string, string[]>> {
    const details = await this.fetchArtistDetails(artistIds);
    const genreMap = new Map<string, string[]>();
    for (const [id, { genres }] of details) {
      genreMap.set(id, genres);
    }
    return genreMap;
  }
}
