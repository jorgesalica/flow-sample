import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { LrcLibAdapter } from '../../src/backend/adapter';
import type { LyricsTrackParams } from '../../src/backend/adapter/adapter';

vi.mock('axios');

const mockedAxios = vi.mocked(axios, true);

describe('LrcLibAdapter', () => {
  let adapter: LrcLibAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: axios.create returns a mock client
    const mockClient = {
      get: vi.fn(),
    };
    mockedAxios.create.mockReturnValue(mockClient as never);

    adapter = new LrcLibAdapter();

    // Expose the inner client mock for per-test control
    (adapter as unknown as { _client: typeof mockClient })._client = mockClient;
  });

  function getInnerClient() {
    return (adapter as unknown as { client: { get: ReturnType<typeof vi.fn> } }).client;
  }

  describe('fetchLyrics', () => {
    it('returns null for empty track name', async () => {
      const result = await adapter.fetchLyrics({
        trackName: '',
        artistName: 'Artist',
        albumName: 'Album',
        durationSeconds: 200,
      });
      expect(result).toBeNull();
    });

    it('returns null for non-positive duration', async () => {
      const result = await adapter.fetchLyrics({
        trackName: 'Song',
        artistName: 'Artist',
        albumName: 'Album',
        durationSeconds: 0,
      });
      expect(result).toBeNull();
    });

    it('returns lyrics on successful response', async () => {
      getInnerClient().get.mockResolvedValueOnce({
        data: {
          id: 1,
          trackName: 'Song',
          artistName: 'Artist',
          albumName: 'Album',
          duration: 200,
          instrumental: false,
          plainLyrics: 'Verse 1\nVerse 2',
          syncedLyrics: '[00:01.00] Verse 1\n[00:05.00] Verse 2',
        },
      });

      const result = await adapter.fetchLyrics({
        trackName: 'Song',
        artistName: 'Artist',
        albumName: 'Album',
        durationSeconds: 200,
      });

      expect(result).not.toBeNull();
      expect(result!.plainLyrics).toBe('Verse 1\nVerse 2');
      expect(result!.syncedLyrics).toBe('[00:01.00] Verse 1\n[00:05.00] Verse 2');
      expect(result!.instrumental).toBe(false);
    });

    it('returns null when response has no lyrics data', async () => {
      getInnerClient().get.mockResolvedValueOnce({
        data: {
          id: 2,
          trackName: 'Song',
          artistName: 'Artist',
          albumName: 'Album',
          duration: 200,
          instrumental: true,
          plainLyrics: null,
          syncedLyrics: null,
        },
      });

      const result = await adapter.fetchLyrics({
        trackName: 'Song',
        artistName: 'Artist',
        albumName: 'Album',
        durationSeconds: 200,
      });

      expect(result).toBeNull();
    });

    it('returns null on 404 response', async () => {
      const error = Object.assign(new Error('Not Found'), {
        isAxiosError: true,
        response: { status: 404 },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);
      getInnerClient().get.mockRejectedValueOnce(error);

      const result = await adapter.fetchLyrics({
        trackName: 'Unknown Song',
        artistName: 'Artist',
        albumName: 'Album',
        durationSeconds: 200,
      });

      expect(result).toBeNull();
    });

    it('returns null on 400 response', async () => {
      const error = Object.assign(new Error('Bad Request'), {
        isAxiosError: true,
        response: { status: 400 },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);
      getInnerClient().get.mockRejectedValueOnce(error);

      const result = await adapter.fetchLyrics({
        trackName: 'Song',
        artistName: 'Artist',
        albumName: 'Album',
        durationSeconds: 200,
      });

      expect(result).toBeNull();
    });

    it('rethrows on unexpected errors', async () => {
      const error = Object.assign(new Error('Network Error'), {
        isAxiosError: true,
        response: { status: 500 },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);
      getInnerClient().get.mockRejectedValueOnce(error);

      await expect(
        adapter.fetchLyrics({
          trackName: 'Song',
          artistName: 'Artist',
          albumName: 'Album',
          durationSeconds: 200,
        }),
      ).rejects.toThrow('Network Error');
    });
  });

  describe('fetchLyricsBatch', () => {
    const tracks: LyricsTrackParams[] = [
      {
        trackId: 'a',
        trackName: 'Song A',
        artistName: 'Artist',
        albumName: 'Album',
        durationSeconds: 180,
      },
      {
        trackId: 'b',
        trackName: 'Song B',
        artistName: 'Artist',
        albumName: 'Album',
        durationSeconds: 200,
      },
      {
        trackId: 'c',
        trackName: 'Song C',
        artistName: 'Artist',
        albumName: 'Album',
        durationSeconds: 210,
      },
    ];

    it('returns results for all tracks', async () => {
      getInnerClient()
        .get.mockResolvedValueOnce({
          data: { plainLyrics: 'Lyrics A', syncedLyrics: null, instrumental: false },
        })
        .mockResolvedValueOnce({
          data: { plainLyrics: null, syncedLyrics: null, instrumental: true },
        })
        .mockResolvedValueOnce({
          data: { plainLyrics: 'Lyrics C', syncedLyrics: '[00:00] C', instrumental: false },
        });

      const results = await adapter.fetchLyricsBatch(tracks);

      expect(results).toHaveLength(3);
      const aResult = results.find((r) => r.trackId === 'a');
      expect(aResult!.result!.plainLyrics).toBe('Lyrics A');
      expect(aResult!.error).toBeUndefined();
    });

    it('returns empty array for empty input', async () => {
      const results = await adapter.fetchLyricsBatch([]);
      expect(results).toHaveLength(0);
    });

    it('captures per-track errors without failing the batch', async () => {
      const networkError = Object.assign(new Error('Timeout'), {
        isAxiosError: true,
        response: { status: 503 },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      getInnerClient()
        .get.mockResolvedValueOnce({
          data: { plainLyrics: 'Lyrics A', syncedLyrics: null, instrumental: false },
        })
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          data: { plainLyrics: 'Lyrics C', syncedLyrics: null, instrumental: false },
        });

      const results = await adapter.fetchLyricsBatch(tracks);

      expect(results).toHaveLength(3);
      const bResult = results.find((r) => r.trackId === 'b');
      expect(bResult!.error).toBe('Timeout');
      expect(bResult!.result).toBeNull();
    });

    it('calls onProgress callback', async () => {
      getInnerClient().get.mockResolvedValue({
        data: { plainLyrics: 'X', syncedLyrics: null, instrumental: false },
      });

      const progress: [number, number][] = [];
      await adapter.fetchLyricsBatch(tracks, (completed, total) => {
        progress.push([completed, total]);
      });

      expect(progress.length).toBeGreaterThan(0);
      expect(progress[progress.length - 1]).toEqual([3, 3]);
    });
  });
});
