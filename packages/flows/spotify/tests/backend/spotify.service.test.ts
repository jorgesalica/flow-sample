import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchOptions, Track } from '@flows/shared';
import type {
  SpotifyCache,
  SpotifyGateway,
  SpotifyTokenRepository,
  SpotifyTrackRepository,
} from '../../src/domain/ports';
import {
  createSpotifyService,
  SpotifyService,
  type SpotifySyncApplication,
} from '../../src/backend/spotify.service';

const track: Track = {
  id: 'track-1',
  title: 'A Song',
  artists: [{ id: 'artist-1', name: 'An Artist', genres: ['rock'] }],
  album: {
    id: 'album-1',
    name: 'An Album',
    releaseDate: '2020-01-01',
    releaseYear: 2020,
  },
  addedAt: '2026-01-01T00:00:00.000Z',
  durationMs: 180000,
};

class TestCache implements SpotifyCache {
  readonly values = new Map<string, unknown>();
  invalidations = 0;

  get<T>(key: string): T | null {
    return this.values.has(key) ? (this.values.get(key) as T) : null;
  }

  set<T>(key: string, value: T): void {
    this.values.set(key, value);
  }

  invalidateAll(): void {
    this.invalidations += 1;
    this.values.clear();
  }
}

const gateway: SpotifyGateway = {
  exchangeCode: vi.fn(),
  fetchTracks: vi.fn(),
  fetchArtistDetails: vi.fn(),
};

const syncApplication: SpotifySyncApplication = {
  fetchAndSave: vi.fn(),
  getTracks: vi.fn(),
  getTrackCount: vi.fn(),
};

const repository: SpotifyTrackRepository = {
  save: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  count: vi.fn(),
  getGenres: vi.fn(),
  getYears: vi.fn(),
  findPaginated: vi.fn(),
};

const tokenRepository: SpotifyTokenRepository = {
  get: vi.fn(),
  set: vi.fn(),
};

const cache = new TestCache();
const service = new SpotifyService(
  {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'http://localhost/callback',
    successUrl: 'http://localhost/spotify',
    pageLimit: 25,
  },
  gateway,
  syncApplication,
  repository,
  tokenRepository,
  cache,
);

describe('SpotifyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cache.values.clear();
    cache.invalidations = 0;
    vi.mocked(syncApplication.fetchAndSave).mockResolvedValue({ count: 12 });
    vi.mocked(syncApplication.getTracks).mockResolvedValue([track]);
    vi.mocked(syncApplication.getTrackCount).mockResolvedValue(1);
    vi.mocked(repository.findById).mockResolvedValue(track);
    vi.mocked(repository.count).mockResolvedValue(0);
    vi.mocked(repository.getGenres).mockResolvedValue([{ genre: 'rock', count: 1 }]);
    vi.mocked(repository.getYears).mockResolvedValue([{ year: 2020, count: 1 }]);
    vi.mocked(repository.findPaginated).mockResolvedValue({
      data: [track],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('builds authorization state and delegates the code exchange', async () => {
    vi.mocked(tokenRepository.get).mockReturnValue('refresh-token');

    expect(service.getAuthorizationUrl()).toContain('client_id=client-id');
    expect(service.getAuthorizationUrl()).toContain(
      'redirect_uri=http%3A%2F%2Flocalhost%2Fcallback',
    );
    expect(service.getSuccessUrl()).toBe('http://localhost/spotify');
    expect(service.getAuthStatus()).toEqual({ connected: true });

    await service.exchangeCode('authorization-code');
    expect(gateway.exchangeCode).toHaveBeenCalledWith('authorization-code');
  });

  it('uses the configured limit and invalidates cache after a successful sync', async () => {
    cache.set('genres', [{ genre: 'stale', count: 1 }]);

    await expect(service.sync()).resolves.toEqual({
      success: true,
      message: 'Flow completed.',
      count: 12,
    });
    expect(syncApplication.fetchAndSave).toHaveBeenCalledWith({ limit: 25 });
    expect(cache.invalidations).toBe(1);
    expect(cache.values.size).toBe(0);
  });

  it('maps UI search options into the repository contract', async () => {
    const options: SearchOptions = {
      page: 2,
      limit: 20,
      q: 'song',
      genre: 'rock',
      year: 2020,
      sortBy: 'title',
      sortOrder: 'asc',
    };

    await service.searchTracks(options);

    expect(repository.findPaginated).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      query: 'song',
      genre: 'rock',
      year: 2020,
      sortBy: 'title',
      sortOrder: 'asc',
    });
  });

  it('delegates track, count, and year reads', async () => {
    await expect(service.getTracks()).resolves.toEqual([track]);
    await expect(service.getTrack(track.id)).resolves.toEqual(track);
    await expect(service.getTrackCount()).resolves.toBe(1);
    await expect(service.getYears()).resolves.toEqual([{ year: 2020, count: 1 }]);
  });

  it('caches genres and computed stats between requests', async () => {
    await service.getGenres();
    await service.getGenres();
    expect(repository.getGenres).toHaveBeenCalledOnce();

    const first = await service.getStats();
    const second = await service.getStats();
    expect(first).toEqual(second);
    expect(repository.count).toHaveBeenCalledOnce();
    expect(first).toEqual({
      totalTracks: 0,
      totalGenres: 1,
      topGenres: [{ genre: 'rock', count: 1 }],
      decadeDistribution: { '2020s': 1 },
      yearRange: { oldest: 2020, newest: 2020 },
    });
  });

  it('composes a service from injected runtime dependencies', async () => {
    const composed = createSpotifyService(
      {
        spotify: {
          clientId: 'client-id',
          clientSecret: 'client-secret',
          redirectUri: 'http://localhost/callback',
          successUrl: 'http://localhost/spotify',
          pageLimit: 25,
        },
      },
      {
        repository,
        tokenRepository,
        gateway,
        syncApplication,
        cache,
      },
    );

    await expect(composed.getTracks()).resolves.toEqual([track]);
  });
});
