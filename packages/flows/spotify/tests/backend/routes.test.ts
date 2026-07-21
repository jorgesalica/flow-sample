import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  SpotifyTopStats,
  Track,
} from '@flows/shared';
import { SpotifyAuthError, SpotifyRateLimitError } from '../../src/domain/errors';
import type { SpotifyApplication } from '../../src/backend/spotify.service';
import { createSpotifyRoutes } from '../../src/backend/routes';

const track: Track = {
  id: 'track-1',
  title: 'A Song',
  artists: [{ id: 'artist-1', name: 'An Artist' }],
  album: { id: 'album-1', name: 'An Album', releaseDate: '2020-01-01' },
  addedAt: '2026-01-01T00:00:00.000Z',
  durationMs: 180000,
};

const stats: SpotifyTopStats = {
  totalTracks: 1,
  totalGenres: 1,
  topGenres: [{ genre: 'rock', count: 1 }],
  decadeDistribution: { '2020s': 1 },
  yearRange: { oldest: 2020, newest: 2020 },
};

const service = {
  getAuthorizationUrl: vi.fn<SpotifyApplication['getAuthorizationUrl']>(),
  getSuccessUrl: vi.fn<SpotifyApplication['getSuccessUrl']>(),
  exchangeCode: vi.fn<SpotifyApplication['exchangeCode']>(),
  getAuthStatus: vi.fn<SpotifyApplication['getAuthStatus']>(),
  sync: vi.fn<SpotifyApplication['sync']>(),
  getTracks: vi.fn<SpotifyApplication['getTracks']>(),
  searchTracks: vi.fn<SpotifyApplication['searchTracks']>(),
  getTrack: vi.fn<SpotifyApplication['getTrack']>(),
  getTrackCount: vi.fn<SpotifyApplication['getTrackCount']>(),
  getGenres: vi.fn<SpotifyApplication['getGenres']>(),
  getYears: vi.fn<SpotifyApplication['getYears']>(),
  getStats: vi.fn<SpotifyApplication['getStats']>(),
};

const config = {
  spotify: {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'http://localhost/callback',
    successUrl: 'http://localhost/spotify',
    pageLimit: 20,
  },
};

function request(path: string, init?: RequestInit): Promise<Response> {
  return createSpotifyRoutes(config, service).handle(
    new Request(`http://localhost${path}`, init),
  );
}

function post(path: string, body?: Record<string, unknown>): Promise<Response> {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Spotify routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getAuthorizationUrl.mockReturnValue('https://accounts.spotify.com/authorize?test=1');
    service.getSuccessUrl.mockReturnValue('http://localhost/spotify');
    service.getAuthStatus.mockReturnValue({ connected: true });
    service.sync.mockResolvedValue({ success: true, message: 'Flow completed.', count: 1 });
    service.getTracks.mockResolvedValue([track]);
    service.searchTracks.mockResolvedValue({
      data: [track],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    service.getTrack.mockResolvedValue(track);
    service.getTrackCount.mockResolvedValue(1);
    service.getGenres.mockResolvedValue([{ genre: 'rock', count: 1 }]);
    service.getYears.mockResolvedValue([{ year: 2020, count: 1 }]);
    service.getStats.mockResolvedValue(stats);
  });

  it('redirects to Spotify login and reports auth status', async () => {
    const login = await request('/api/spotify/auth/login');
    const status = await request('/api/spotify/auth/status');

    expect(login.status).toBe(302);
    expect(login.headers.get('Location')).toBe('https://accounts.spotify.com/authorize?test=1');
    expect(status.status).toBe(200);
    await expect(status.json()).resolves.toEqual({ connected: true });
  });

  it('validates callback codes and redirects after exchange', async () => {
    const missing = await request('/api/spotify/auth/callback');
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ error: 'No code provided' });

    const success = await request('/api/spotify/auth/callback?code=abc');
    expect(service.exchangeCode).toHaveBeenCalledWith('abc');
    expect(success.status).toBe(302);
    expect(success.headers.get('Location')).toBe('http://localhost/spotify');
  });

  it('sanitizes callback provider failures', async () => {
    service.exchangeCode.mockRejectedValue(new Error('secret provider response'));

    const response = await request('/api/spotify/auth/callback?code=abc');

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toEqual({ error: 'Spotify is temporarily unavailable' });
    expect(JSON.stringify(body)).not.toContain('secret provider response');
  });

  it('returns sync results and deliberate provider statuses', async () => {
    const success = await post('/api/spotify/run', { limit: 7 });
    expect(success.status).toBe(200);
    expect(service.sync).toHaveBeenCalledWith(7);

    service.sync.mockRejectedValueOnce(new SpotifyAuthError('secret auth detail'));
    const unauthorized = await post('/api/spotify/run');
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toEqual({
      error: 'Spotify authorization is required',
    });

    service.sync.mockRejectedValueOnce(new SpotifyRateLimitError(9));
    const limited = await post('/api/spotify/run');
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('9');
    await expect(limited.json()).resolves.toEqual({
      error: 'Spotify rate limit reached',
      retryAfterSeconds: 9,
    });

    service.sync.mockRejectedValueOnce(new Error('secret provider detail'));
    const unavailable = await post('/api/spotify/run');
    expect(unavailable.status).toBe(502);
    await expect(unavailable.json()).resolves.toEqual({
      error: 'Spotify is temporarily unavailable',
    });
  });

  it('passes validated search options to the application', async () => {
    const response = await request(
      '/api/spotify/tracks/search?page=2&limit=10&q=song&sortBy=title&sortOrder=asc',
    );

    expect(response.status).toBe(200);
    expect(service.searchTracks).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      q: 'song',
      sortBy: 'title',
      sortOrder: 'asc',
    });
  });

  it('returns tracks and maps a missing lookup to 404', async () => {
    const found = await request('/api/spotify/tracks/track-1');
    expect(found.status).toBe(200);
    await expect(found.json()).resolves.toEqual(track);

    service.getTrack.mockResolvedValueOnce(null);
    const missing = await request('/api/spotify/tracks/missing');
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'Track not found' });
  });

  it('returns aggregate endpoints through typed contracts', async () => {
    await expect((await request('/api/spotify/tracks')).json()).resolves.toEqual([track]);
    await expect((await request('/api/spotify/count')).json()).resolves.toEqual({ count: 1 });
    await expect((await request('/api/spotify/genres')).json()).resolves.toEqual([
      { genre: 'rock', count: 1 },
    ]);
    await expect((await request('/api/spotify/years')).json()).resolves.toEqual([
      { year: 2020, count: 1 },
    ]);
    await expect((await request('/api/spotify/stats')).json()).resolves.toEqual(stats);
  });
});
