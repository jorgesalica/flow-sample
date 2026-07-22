import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LYRICS_STATUSES, type Track, type TrackRepository } from '@flows/shared';
import { LyricsFetchError, LyricsNotFoundError } from '../../src/domain/errors';
import type { LyricsRepository, LyricsSource } from '../../src/domain/ports';
import { LyricsService } from '../../src/backend/lyrics.service';

const track: Track = {
  id: 'track-1',
  title: 'A Song',
  artists: [{ id: 'artist-1', name: 'An Artist' }],
  album: { id: 'album-1', name: 'An Album', releaseDate: '2020-01-01' },
  addedAt: '2026-01-01T00:00:00.000Z',
  durationMs: 180000,
};

const lyricsRepository: LyricsRepository = {
  findByTrackId: vi.fn(),
  save: vi.fn(),
  markNotFound: vi.fn(),
  getPendingTrackIds: vi.fn(),
  getStats: vi.fn(),
  getLibraryWithStatus: vi.fn(),
  getInterpretation: vi.fn(),
  saveInterpretation: vi.fn(),
};

const trackRepository: TrackRepository = {
  save: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  count: vi.fn(),
  getGenres: vi.fn(),
  getYears: vi.fn(),
};

const source: LyricsSource = {
  fetchLyrics: vi.fn(),
  fetchLyricsBatch: vi.fn(),
};

const service = new LyricsService(lyricsRepository, trackRepository, source);

describe('LyricsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lyricsRepository.findByTrackId).mockResolvedValue(null);
    vi.mocked(lyricsRepository.getPendingTrackIds).mockResolvedValue([]);
    vi.mocked(lyricsRepository.save).mockResolvedValue(undefined);
    vi.mocked(lyricsRepository.markNotFound).mockResolvedValue(undefined);
    vi.mocked(trackRepository.findById).mockResolvedValue(track);
    vi.mocked(source.fetchLyrics).mockResolvedValue(null);
    vi.mocked(source.fetchLyricsBatch).mockResolvedValue([]);
  });

  it('returns a cached terminal record without calling the provider', async () => {
    const cached = {
      trackId: track.id,
      plainLyrics: 'Cached lyrics',
      syncedLyrics: null,
      status: LYRICS_STATUSES.FOUND,
      fetchedAt: '2026-01-01T00:00:00.000Z',
      interpretation: null,
    };
    vi.mocked(lyricsRepository.findByTrackId).mockResolvedValue(cached);

    await expect(service.getLyrics(track.id)).resolves.toEqual(cached);
    expect(source.fetchLyrics).not.toHaveBeenCalled();
  });

  it('fetches, persists, and returns lyrics for a known track', async () => {
    vi.mocked(source.fetchLyrics).mockResolvedValue({
      plainLyrics: 'Fresh lyrics',
      syncedLyrics: null,
      instrumental: false,
    });

    const result = await service.getLyrics(track.id, true);

    expect(source.fetchLyrics).toHaveBeenCalledWith({
      trackName: track.title,
      artistName: 'An Artist',
      albumName: 'An Album',
      durationSeconds: 180,
    });
    expect(lyricsRepository.save).toHaveBeenCalledWith(track.id, {
      plainLyrics: 'Fresh lyrics',
      syncedLyrics: null,
    });
    expect(result.status).toBe(LYRICS_STATUSES.FOUND);
    expect(result.plainLyrics).toBe('Fresh lyrics');
  });

  it('persists a deliberate not_found outcome', async () => {
    const result = await service.getLyrics(track.id);

    expect(lyricsRepository.markNotFound).toHaveBeenCalledWith(track.id);
    expect(result.status).toBe(LYRICS_STATUSES.NOT_FOUND);
  });

  it('distinguishes missing tracks from provider failures', async () => {
    vi.mocked(trackRepository.findById).mockResolvedValueOnce(null);
    await expect(service.getLyrics('missing')).rejects.toBeInstanceOf(LyricsNotFoundError);

    vi.mocked(source.fetchLyrics).mockRejectedValueOnce(new Error('secret provider response'));
    await expect(service.getLyrics(track.id)).rejects.toBeInstanceOf(LyricsFetchError);
  });

  it('does not misclassify persistence failures as provider failures', async () => {
    vi.mocked(source.fetchLyrics).mockResolvedValue({
      plainLyrics: 'Fresh lyrics',
      syncedLyrics: null,
      instrumental: false,
    });
    vi.mocked(lyricsRepository.save).mockRejectedValue(new Error('database write failed'));

    await expect(service.getLyrics(track.id)).rejects.toThrow('database write failed');
  });

  it('processes batch results and honors retryFailed', async () => {
    vi.mocked(lyricsRepository.getPendingTrackIds).mockResolvedValue([
      'track-1',
      'track-2',
      'missing',
    ]);
    vi.mocked(trackRepository.findById)
      .mockResolvedValueOnce(track)
      .mockResolvedValueOnce({ ...track, id: 'track-2', title: 'Second Song' })
      .mockResolvedValueOnce(null);
    vi.mocked(source.fetchLyricsBatch).mockResolvedValue([
      {
        trackId: 'track-1',
        result: { plainLyrics: 'Lyrics', syncedLyrics: null, instrumental: false },
      },
      { trackId: 'track-2', result: null },
    ]);

    await expect(service.fetchAll(true)).resolves.toEqual({
      processed: 3,
      found: 1,
      notFound: 1,
      errors: 1,
    });
    expect(lyricsRepository.getPendingTrackIds).toHaveBeenCalledWith(true);
    expect(lyricsRepository.save).toHaveBeenCalledWith('track-1', {
      plainLyrics: 'Lyrics',
      syncedLyrics: null,
    });
    expect(lyricsRepository.markNotFound).toHaveBeenCalledWith('track-2');
  });

  it('maps a rejected batch request to LyricsFetchError', async () => {
    vi.mocked(lyricsRepository.getPendingTrackIds).mockResolvedValue([track.id]);
    vi.mocked(source.fetchLyricsBatch).mockRejectedValue(new Error('secret provider response'));

    await expect(service.fetchAll()).rejects.toBeInstanceOf(LyricsFetchError);
  });

  it('delegates stats and library queries', async () => {
    const stats = { total: 1, found: 1, notFound: 0, pending: 0 };
    const rows = [
      {
        id: track.id,
        title: track.title,
        artist: 'An Artist',
        imageUrl: null,
        status: LYRICS_STATUSES.FOUND,
      },
    ];
    vi.mocked(lyricsRepository.getStats).mockResolvedValue(stats);
    vi.mocked(lyricsRepository.getLibraryWithStatus).mockResolvedValue(rows);

    await expect(service.getStats()).resolves.toEqual(stats);
    await expect(service.getLibrary(10, 20, LYRICS_STATUSES.FOUND)).resolves.toEqual(rows);
    expect(lyricsRepository.getLibraryWithStatus).toHaveBeenCalledWith(
      10,
      20,
      LYRICS_STATUSES.FOUND,
    );
  });
});
