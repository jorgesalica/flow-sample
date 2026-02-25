import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { SourcePort } from '../../domain/ports';
import type { Track } from '@flows/shared';
import { SpotifyAuthError, SpotifyRateLimitError } from '../../domain/errors';
import type {
  SpotifySavedTrack,
  SpotifyPaging,
  SpotifyTokenResponse,
  SpotifyArtistsResponse,
} from './types.js';
import { logger } from '@flows/core';

const log = logger.child({ module: 'SpotifyApiAdapter' });

import type { SQLiteTokenRepository } from '../token.repository';

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
}

export class SpotifyApiAdapter implements SourcePort {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenRepository?: SQLiteTokenRepository;

  constructor(
    private config: SpotifyConfig,
    tokenRepository?: SQLiteTokenRepository,
  ) {
    this.tokenRepository = tokenRepository;
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
          } catch {
            throw new SpotifyAuthError('Token refresh failed');
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

      // 2. Save new tokens to DB if we have a repository
      if (this.tokenRepository) {
        // Expire slightly before actual expiration (e.g. 1 min buffer)
        const expiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
        this.tokenRepository.set('spotify:access_token', this.accessToken, expiresAt);

        // Update refresh token if provided (it might rotate)
        if (response.data.refresh_token) {
          // Refresh tokens last a long time, but let's give it 30 days default or just ignore exp for logic
          this.tokenRepository.set(
            'spotify:refresh_token',
            response.data.refresh_token,
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          );
        }
      }
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
          redirect_uri: 'http://127.0.0.1:4173/api/spotify/auth/callback',
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

      if (this.tokenRepository) {
        const expiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
        this.tokenRepository.set('spotify:access_token', this.accessToken, expiresAt);
        if (response.data.refresh_token) {
          this.tokenRepository.set(
            'spotify:refresh_token',
            response.data.refresh_token,
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          );
        }
      }
    } catch (error) {
      log.error({ error }, 'Failed to exchange code');
      throw new SpotifyAuthError('Failed to exchange code');
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

      const pageTracks = data.items.map((item) => this.mapToTrack(item));
      tracks.push(...pageTracks);

      nextUrl = data.next ? data.next.replace('https://api.spotify.com/v1', '') : null;
      page++;
    }

    log.info({ trackCount: tracks.length, pagesFetched: page - 1 }, 'Fetched liked tracks');
    return tracks;
  }

  private mapToTrack(item: SpotifySavedTrack): Track {
    const t = item.track;
    // Get the medium-sized image (300x300) or fallback to first available
    const albumImage = t.album.images.find((img) => img.width === 300) || t.album.images[0];

    return {
      id: t.id,
      title: t.name,
      artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
      album: {
        id: t.album.id,
        name: t.album.name,
        releaseDate: t.album.release_date,
        releaseYear: parseInt(t.album.release_date.split('-')[0]) || undefined,
        imageUrl: albumImage?.url,
      },
      addedAt: item.added_at,
      durationMs: t.duration_ms,
      popularity: t.popularity,
      previewUrl: t.preview_url || undefined,
      spotifyUrl: `https://open.spotify.com/track/${t.id}`,
    };
  }

  /**
   * Fetch genres and images for a list of artist IDs.
   * Spotify API allows up to 50 artists per request.
   * Returns a Map of artistId -> { genres: string[], imageUrl?: string }
   */
  async fetchArtistDetails(
    artistIds: string[],
  ): Promise<Map<string, { genres: string[]; imageUrl?: string }>> {
    if (!this.accessToken) await this.refreshAccessToken();

    const detailsMap = new Map<string, { genres: string[]; imageUrl?: string }>();
    const uniqueIds = [...new Set(artistIds)];

    log.info({ artistCount: uniqueIds.length }, 'Fetching artist details from Spotify');

    // Batch in chunks of 50 (Spotify limit)
    const batchSize = 50;
    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const batch = uniqueIds.slice(i, i + batchSize);
      const ids = batch.join(',');

      try {
        const response: AxiosResponse<SpotifyArtistsResponse> = await this.client.get(
          `/artists?ids=${ids}`,
        );

        for (const artist of response.data.artists) {
          if (artist) {
            // Get small image (160px) for artist avatar
            const image = artist.images.find((img) => img.width === 160) || artist.images[0];
            detailsMap.set(artist.id, {
              genres: artist.genres,
              imageUrl: image?.url,
            });
          }
        }
      } catch (error) {
        // Log but don't fail the whole operation
        log.error(
          { batchStart: i, error: error instanceof Error ? error.message : 'Unknown' },
          'Failed to fetch artist details batch',
        );
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
