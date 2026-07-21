import { describe, expect, it } from 'vitest';
import { createBackendConfigFromEnv } from '../../src/api/config';

describe('backend environment config', () => {
  it('uses local defaults for an empty environment', () => {
    expect(createBackendConfigFromEnv({})).toEqual({
      port: 4173,
      spotify: {
        clientId: '',
        clientSecret: '',
        redirectUri: 'http://127.0.0.1:4173/api/spotify/auth/callback',
        successUrl: 'http://localhost:5173/spotify?connected=true',
        refreshToken: undefined,
        pageLimit: 5,
      },
    });
  });

  it('maps configured Spotify and host values', () => {
    expect(
      createBackendConfigFromEnv({
        PORT: '8000',
        SPOTIFY_CLIENT_ID: 'client-id',
        SPOTIFY_CLIENT_SECRET: 'client-secret',
        SPOTIFY_REDIRECT_URI: 'https://example.test/callback',
        SPOTIFY_SUCCESS_URL: 'https://example.test/spotify',
        SPOTIFY_REFRESH_TOKEN: 'refresh-token',
        SPOTIFY_PAGE_LIMIT: '12',
      }),
    ).toEqual({
      port: 8000,
      spotify: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://example.test/callback',
        successUrl: 'https://example.test/spotify',
        refreshToken: 'refresh-token',
        pageLimit: 12,
      },
    });
  });

  it('falls back when integer settings are absent or invalid', () => {
    const config = createBackendConfigFromEnv({ PORT: 'invalid', SPOTIFY_PAGE_LIMIT: '' });

    expect(config.port).toBe(4173);
    expect(config.spotify.pageLimit).toBe(5);
  });
});
