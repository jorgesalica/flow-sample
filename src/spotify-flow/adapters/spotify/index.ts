import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { SourcePort } from '../../core/ports';
import { Track } from '../../core/types';
import { Config } from '../../config/schema';
import { SpotifyAuthError, SpotifyRateLimitError } from '../../core/errors';
import { SpotifySavedTrack, SpotifyPaging, SpotifyTokenResponse } from './types';

export class SpotifyAdapter implements SourcePort {
    private client: AxiosInstance;
    private accessToken: string | null = null;

    constructor(private config: Config['spotify']) {
        this.client = axios.create({
            baseURL: 'https://api.spotify.com/v1',
        });

        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const status = error.response?.status;
                const originalRequest = error.config as (typeof error.config & { _retry?: boolean });

                // Rate limit (429)
                if (status === 429) {
                    const retryAfter = parseInt(error.response?.headers?.['retry-after'] as string || '60');
                    throw new SpotifyRateLimitError(retryAfter);
                }

                // Auth error on first try - attempt refresh
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

                // Auth error after retry
                if (status === 401) {
                    throw new SpotifyAuthError('Unauthorized');
                }

                return Promise.reject(error);
            }
        );
    }

    private async refreshAccessToken(): Promise<void> {
        if (!this.config.refreshToken) {
            throw new SpotifyAuthError('No refresh token provided');
        }

        const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

        try {
            const response: AxiosResponse<SpotifyTokenResponse> = await axios.post(
                'https://accounts.spotify.com/api/token',
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.config.refreshToken,
                }),
                {
                    headers: {
                        'Authorization': `Basic ${basicAuth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            this.accessToken = response.data.access_token;
            this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
        } catch (error) {
            if (error instanceof SpotifyAuthError) throw error;
            throw new SpotifyAuthError('Failed to refresh access token');
        }
    }

    async fetchTracks(limit: number = 20): Promise<Track[]> {
        if (!this.accessToken) await this.refreshAccessToken();

        const tracks: Track[] = [];
        let nextUrl: string | null = '/me/tracks?limit=50';
        let page = 1;

        while (nextUrl && page <= limit) {
            const response: AxiosResponse<SpotifyPaging<SpotifySavedTrack>> = await this.client.get(nextUrl);
            const data = response.data;

            const pageTracks = data.items.map((item) => this.mapToTrack(item));
            tracks.push(...pageTracks);

            nextUrl = data.next ? data.next.replace('https://api.spotify.com/v1', '') : null;
            page++;
        }

        return tracks;
    }

    private mapToTrack(item: SpotifySavedTrack): Track {
        const t = item.track;
        return {
            id: t.id,
            title: t.name,
            artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
            album: {
                id: t.album.id,
                name: t.album.name,
                releaseDate: t.album.release_date,
                releaseYear: parseInt(t.album.release_date.split('-')[0]) || undefined
            },
            addedAt: item.added_at,
            durationMs: t.duration_ms,
            popularity: t.popularity,
        };
    }
}
