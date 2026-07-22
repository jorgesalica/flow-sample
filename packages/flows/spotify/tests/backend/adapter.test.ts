import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpotifyAuthError, SpotifyRateLimitError } from '../../src/domain/errors';

// ── Controllable axios instance (returned by axios.create) ─────────────
type ResponseErrorHandler = (error: unknown) => Promise<unknown>;

interface FakeInstance {
  get: ReturnType<typeof vi.fn>;
  defaults: { headers: { common: Record<string, string> } };
  interceptors: { response: { use: ReturnType<typeof vi.fn> } };
  // captured rejection handler registered by the adapter
  onError?: ResponseErrorHandler;
}

let fakeInstance: FakeInstance;
const axiosPost = vi.fn();

function makeFakeInstance(): FakeInstance {
  // The interceptor calls `this.client(originalRequest)` to retry, so the
  // instance itself must be callable. Build the callable first, then attach
  // properties so the `use` closure mutates the same object the test reads.
  const callable = vi.fn((req: unknown) => inst.get(req)) as unknown as FakeInstance;
  const inst = callable;
  inst.get = vi.fn();
  inst.defaults = { headers: { common: {} } };
  inst.interceptors = {
    response: {
      use: vi.fn((_onFulfilled: unknown, onRejected: ResponseErrorHandler) => {
        inst.onError = onRejected;
      }),
    },
  };
  return inst;
}

vi.mock('axios', async (importOriginal) => {
  const original = await importOriginal<typeof import('axios')>();
  const create = vi.fn(() => fakeInstance);
  return {
    ...original,
    default: { ...original.default, create, post: axiosPost },
    AxiosError: original.AxiosError,
    create,
    post: axiosPost,
  };
});

const artistCacheGetMany = vi.fn(() => ({ cached: new Map(), misses: [] as string[] }));
const artistCacheSet = vi.fn();
const artistCache = {
  getMany: artistCacheGetMany,
  set: artistCacheSet,
};

const { SpotifyApiAdapter } = await import('../../src/backend/adapter/adapter');
const { AxiosError } = await import('axios');

const CONFIG = {
  clientId: 'mock-client-id',
  clientSecret: 'mock-client-secret',
  redirectUri: 'https://app.mock.test/callback',
  refreshToken: 'mock-refresh-token',
};

// Builds a saved-track item in Spotify API shape.
function savedTrack(over: { id?: string; name?: string; next?: string | null } = {}) {
  return {
    added_at: '2024-01-01T00:00:00Z',
    track: {
      id: over.id ?? 'track-1',
      name: over.name ?? 'Mock Song',
      uri: 'spotify:track:track-1',
      duration_ms: 200000,
      preview_url: 'https://preview.mock.test/1.mp3',
      album: {
        id: 'album-1',
        name: 'Mock Album',
        release_date: '2015-06-01',
        total_tracks: 10,
        images: [
          { url: 'https://img.mock.test/300.jpg', width: 300, height: 300 },
          { url: 'https://img.mock.test/64.jpg', width: 64, height: 64 },
        ],
        artists: [],
      },
      artists: [{ id: 'artist-1', name: 'Mock Artist', uri: 'spotify:artist:artist-1' }],
    },
  };
}

function tokenResponse(
  over: Partial<{ access_token: string; expires_in: number; refresh_token: string }> = {},
) {
  return {
    data: {
      access_token: over.access_token ?? 'fresh-access-token',
      token_type: 'Bearer',
      scope: 'user-library-read',
      expires_in: over.expires_in ?? 3600,
      ...(over.refresh_token ? { refresh_token: over.refresh_token } : {}),
    },
  };
}

beforeEach(() => {
  fakeInstance = makeFakeInstance();
  axiosPost.mockReset();
  artistCacheGetMany.mockReset().mockReturnValue({ cached: new Map(), misses: [] });
  artistCacheSet.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SpotifyApiAdapter', () => {
  it('registers a response interceptor on construction', () => {
    new SpotifyApiAdapter(CONFIG);
    expect(fakeInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  describe('token refresh', () => {
    it('refreshes the access token before the first fetch and sets the auth header', async () => {
      axiosPost.mockResolvedValue(tokenResponse({ access_token: 'tok-123' }));
      fakeInstance.get.mockResolvedValue({
        data: { items: [savedTrack()], next: null },
      });

      const adapter = new SpotifyApiAdapter(CONFIG);
      await adapter.fetchTracks(1);

      expect(axiosPost).toHaveBeenCalledTimes(1);
      const [url, body] = axiosPost.mock.calls[0];
      expect(url).toBe('https://accounts.spotify.com/api/token');
      expect((body as URLSearchParams).get('grant_type')).toBe('refresh_token');
      expect((body as URLSearchParams).get('refresh_token')).toBe('mock-refresh-token');
      expect(fakeInstance.defaults.headers.common['Authorization']).toBe('Bearer tok-123');
    });

    it('prefers a refresh token stored in the token repository over config', async () => {
      const tokenRepo = { get: vi.fn().mockReturnValue('db-refresh-token'), set: vi.fn() };
      axiosPost.mockResolvedValue(tokenResponse());
      fakeInstance.get.mockResolvedValue({ data: { items: [], next: null } });

      const adapter = new SpotifyApiAdapter(CONFIG, tokenRepo as never);
      await adapter.fetchTracks(1);

      const body = axiosPost.mock.calls[0][1] as URLSearchParams;
      expect(body.get('refresh_token')).toBe('db-refresh-token');
    });

    it('throws SpotifyAuthError when no refresh token is available', async () => {
      const adapter = new SpotifyApiAdapter({ ...CONFIG, refreshToken: undefined });
      await expect(adapter.fetchTracks(1)).rejects.toBeInstanceOf(SpotifyAuthError);
      expect(axiosPost).not.toHaveBeenCalled();
    });

    it('wraps a token endpoint failure in SpotifyAuthError', async () => {
      axiosPost.mockRejectedValue(new Error('network down'));
      const adapter = new SpotifyApiAdapter(CONFIG);
      await expect(adapter.fetchTracks(1)).rejects.toBeInstanceOf(SpotifyAuthError);
    });

    it('persists tokens to the repository on refresh', async () => {
      const tokenRepo = { get: vi.fn().mockReturnValue(null), set: vi.fn() };
      axiosPost.mockResolvedValue(
        tokenResponse({ access_token: 'acc', refresh_token: 'new-refresh' }),
      );
      fakeInstance.get.mockResolvedValue({ data: { items: [], next: null } });

      const adapter = new SpotifyApiAdapter(CONFIG, tokenRepo as never);
      await adapter.fetchTracks(1);

      expect(tokenRepo.set).toHaveBeenCalledWith('spotify:access_token', 'acc', expect.any(Number));
      expect(tokenRepo.set).toHaveBeenCalledWith(
        'spotify:refresh_token',
        'new-refresh',
        expect.any(Number),
      );
    });
  });

  describe('exchangeCode', () => {
    it('exchanges an authorization code for tokens', async () => {
      axiosPost.mockResolvedValue(tokenResponse({ access_token: 'exchanged' }));
      const adapter = new SpotifyApiAdapter(CONFIG);

      await adapter.exchangeCode('auth-code-123');

      const [url, body] = axiosPost.mock.calls[0];
      expect(url).toBe('https://accounts.spotify.com/api/token');
      expect((body as URLSearchParams).get('grant_type')).toBe('authorization_code');
      expect((body as URLSearchParams).get('code')).toBe('auth-code-123');
      expect((body as URLSearchParams).get('redirect_uri')).toBe(CONFIG.redirectUri);
      expect(fakeInstance.defaults.headers.common['Authorization']).toBe('Bearer exchanged');
    });

    it('maps a failed exchange to SpotifyAuthError', async () => {
      axiosPost.mockRejectedValue(new Error('bad code'));
      const adapter = new SpotifyApiAdapter(CONFIG);
      await expect(adapter.exchangeCode('bad')).rejects.toBeInstanceOf(SpotifyAuthError);
    });
  });

  describe('fetchTracks', () => {
    beforeEach(() => {
      axiosPost.mockResolvedValue(tokenResponse());
    });

    it('maps Spotify saved tracks to domain Track objects', async () => {
      fakeInstance.get.mockResolvedValue({
        data: { items: [savedTrack({ id: 'track-9', name: 'Hit' })], next: null },
      });

      const adapter = new SpotifyApiAdapter(CONFIG);
      const tracks = await adapter.fetchTracks(1);

      expect(tracks).toHaveLength(1);
      const t = tracks[0];
      expect(t.id).toBe('track-9');
      expect(t.title).toBe('Hit');
      expect(t.album.releaseYear).toBe(2015);
      expect(t.album.imageUrl).toBe('https://img.mock.test/300.jpg');
      expect(t.spotifyUrl).toBe('https://open.spotify.com/track/track-9');
      expect(t.artists[0]).toEqual({ id: 'artist-1', name: 'Mock Artist' });
      expect(t.addedAt).toBe('2024-01-01T00:00:00Z');
    });

    it('paginates by following `next` up to the page limit', async () => {
      fakeInstance.get
        .mockResolvedValueOnce({
          data: {
            items: [savedTrack({ id: 'p1' })],
            next: 'https://api.spotify.com/v1/me/tracks?offset=50&limit=50',
          },
        })
        .mockResolvedValueOnce({
          data: { items: [savedTrack({ id: 'p2' })], next: null },
        });

      const adapter = new SpotifyApiAdapter(CONFIG);
      const tracks = await adapter.fetchTracks(5);

      expect(fakeInstance.get).toHaveBeenCalledTimes(2);
      // `next` should be rewritten to a relative path before the 2nd call
      expect(fakeInstance.get).toHaveBeenNthCalledWith(2, '/me/tracks?offset=50&limit=50');
      expect(tracks.map((t) => t.id)).toEqual(['p1', 'p2']);
    });

    it('stops at the page limit even when more pages exist', async () => {
      fakeInstance.get.mockResolvedValue({
        data: {
          items: [savedTrack()],
          next: 'https://api.spotify.com/v1/me/tracks?offset=50&limit=50',
        },
      });

      const adapter = new SpotifyApiAdapter(CONFIG);
      await adapter.fetchTracks(1);

      expect(fakeInstance.get).toHaveBeenCalledTimes(1);
    });

    it('skips tracks whose track object is missing instead of throwing', async () => {
      fakeInstance.get.mockResolvedValue({
        data: {
          items: [{ added_at: '2024-01-01T00:00:00Z', track: null }, savedTrack({ id: 'ok' })],
          next: null,
        },
      });

      const adapter = new SpotifyApiAdapter(CONFIG);
      const tracks = await adapter.fetchTracks(1);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].id).toBe('ok');
    });
  });

  describe('error-mapping interceptor', () => {
    function axiosErrorWith(status: number, headers: Record<string, string> = {}, config = {}) {
      const err = new AxiosError('request failed');
      err.response = {
        status,
        headers,
        data: {},
        statusText: '',
        config: config as never,
      } as never;
      err.config = config as never;
      return err;
    }

    it('maps a 401 (no retry context) to SpotifyAuthError', async () => {
      new SpotifyApiAdapter(CONFIG);
      const handler = fakeInstance.onError!;
      // No `config` => cannot retry => surfaces as Unauthorized.
      await expect(handler(axiosErrorWith(401, {}, undefined as never))).rejects.toBeInstanceOf(
        SpotifyAuthError,
      );
    });

    it('throws SpotifyRateLimitError after exhausting 429 retries', async () => {
      new SpotifyApiAdapter(CONFIG);
      const handler = fakeInstance.onError!;
      // _retryCount already at max (3) => immediately throws rate-limit error.
      const err = axiosErrorWith(429, { 'retry-after': '7' }, { _retryCount: 3 });
      await expect(handler(err)).rejects.toMatchObject({
        name: 'SpotifyRateLimitError',
        retryAfterSeconds: 7,
      });
    });

    it('rejects with the original error for non-auth, non-rate-limit statuses', async () => {
      new SpotifyApiAdapter(CONFIG);
      const handler = fakeInstance.onError!;
      const err = axiosErrorWith(500, {}, {});
      await expect(handler(err)).rejects.toBe(err);
    });

    it('refreshes the token and retries once on a 401 with retry context', async () => {
      axiosPost.mockResolvedValue(tokenResponse({ access_token: 'refreshed-tok' }));
      new SpotifyApiAdapter(CONFIG);
      const handler = fakeInstance.onError!;

      const originalRequest = { headers: {} as Record<string, string> };
      const err = axiosErrorWith(401, {}, originalRequest);

      await handler(err);

      // token endpoint hit + retried original request with new bearer
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(originalRequest.headers['Authorization']).toBe('Bearer refreshed-tok');
      expect(fakeInstance.get).toHaveBeenCalledWith(originalRequest);
    });

    it('wraps a failed refresh during 401 retry in SpotifyAuthError', async () => {
      axiosPost.mockRejectedValue(new Error('refresh boom'));
      new SpotifyApiAdapter(CONFIG);
      const handler = fakeInstance.onError!;

      const originalRequest = { headers: {} as Record<string, string> };
      const err = axiosErrorWith(401, {}, originalRequest);

      await expect(handler(err)).rejects.toBeInstanceOf(SpotifyAuthError);
    });
  });

  describe('fetchArtistDetails', () => {
    beforeEach(() => {
      axiosPost.mockResolvedValue(tokenResponse());
    });

    it('returns cached entries without hitting the API', async () => {
      artistCacheGetMany.mockReturnValue({
        cached: new Map([
          ['artist-1', { genres: ['rock'], imageUrl: 'https://img.mock.test/a.jpg' }],
        ]),
        misses: [],
      });

      const adapter = new SpotifyApiAdapter(CONFIG, undefined, artistCache);
      const details = await adapter.fetchArtistDetails(['artist-1']);

      expect(details.get('artist-1')).toEqual({
        genres: ['rock'],
        imageUrl: 'https://img.mock.test/a.jpg',
      });
      expect(fakeInstance.get).not.toHaveBeenCalled();
    });

    it('fetches misses individually and caches the results', async () => {
      artistCacheGetMany.mockReturnValue({ cached: new Map(), misses: ['artist-2'] });
      fakeInstance.get.mockResolvedValue({
        data: {
          id: 'artist-2',
          name: 'Fetched',
          genres: ['jazz'],
          images: [{ url: 'https://img.mock.test/160.jpg', width: 160, height: 160 }],
        },
      });

      const adapter = new SpotifyApiAdapter(CONFIG, undefined, artistCache);
      const details = await adapter.fetchArtistDetails(['artist-2']);

      expect(fakeInstance.get).toHaveBeenCalledWith('/artists/artist-2');
      expect(details.get('artist-2')).toEqual({
        genres: ['jazz'],
        imageUrl: 'https://img.mock.test/160.jpg',
      });
      expect(artistCacheSet).toHaveBeenCalledWith(
        'artist-2',
        ['jazz'],
        'https://img.mock.test/160.jpg',
      );
    });

    it('deduplicates input ids before the cache lookup', async () => {
      artistCacheGetMany.mockReturnValue({ cached: new Map(), misses: [] });
      const adapter = new SpotifyApiAdapter(CONFIG, undefined, artistCache);

      await adapter.fetchArtistDetails(['dup', 'dup', 'dup']);

      expect(artistCacheGetMany).toHaveBeenCalledWith(['dup']);
    });
  });

  describe('fetchArtistGenres (legacy)', () => {
    beforeEach(() => {
      axiosPost.mockResolvedValue(tokenResponse());
    });

    it('returns a genre-only map derived from fetchArtistDetails', async () => {
      artistCacheGetMany.mockReturnValue({
        cached: new Map([['artist-1', { genres: ['rock', 'indie'], imageUrl: undefined }]]),
        misses: [],
      });

      const adapter = new SpotifyApiAdapter(CONFIG, undefined, artistCache);
      const genres = await adapter.fetchArtistGenres(['artist-1']);

      expect(genres.get('artist-1')).toEqual(['rock', 'indie']);
    });
  });
});
