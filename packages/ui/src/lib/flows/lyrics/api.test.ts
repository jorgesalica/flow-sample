import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lyrics, LyricsStats } from '@flows/shared';

const mocks = vi.hoisted(() => ({
  route: vi.fn(),
  lyricsGet: vi.fn(),
  fetchAllPost: vi.fn(),
  statsGet: vi.fn(),
  tracksGet: vi.fn(),
}));

vi.mock('@lib/client', () => {
  const lyrics = Object.assign(
    (params: { trackId: string }) => {
      mocks.route(params);
      return { get: mocks.lyricsGet };
    },
    {
      'fetch-all': { post: mocks.fetchAllPost },
      stats: { get: mocks.statsGet },
      tracks: { get: mocks.tracksGet },
    }
  );
  return { api: { api: { lyrics } } };
});

const { fetchAllLyrics, getLyrics, getLyricsLibrary, getLyricsStats, interpretLyrics } =
  await import('./api');

const lyrics: Lyrics = {
  trackId: 'track-1',
  plainLyrics: 'Song lyrics',
  syncedLyrics: null,
  status: 'found',
  fetchedAt: '2026-01-01T00:00:00.000Z',
  interpretation: null,
};

const stats: LyricsStats = {
  total: 10,
  found: 6,
  notFound: 2,
  pending: 2,
};

describe('Lyrics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the typed dynamic Eden route for individual lyrics', async () => {
    mocks.lyricsGet.mockResolvedValue({ data: lyrics, error: null });

    await expect(getLyrics('track-1', { force: true })).resolves.toEqual(lyrics);
    expect(mocks.route).toHaveBeenCalledWith({ trackId: 'track-1' });
    expect(mocks.lyricsGet).toHaveBeenCalledWith({ query: { force: 'true' } });

    await getLyrics('track-1', { force: false });
    expect(mocks.lyricsGet).toHaveBeenLastCalledWith({
      query: { force: undefined },
    });
  });

  it('surfaces individual fetch errors', async () => {
    mocks.lyricsGet.mockResolvedValue({ data: null, error: { status: 502 } });

    await expect(getLyrics('track-1')).rejects.toThrow('Failed to fetch lyrics');
  });

  it('posts retryFailed through the typed batch endpoint', async () => {
    const result = { processed: 3, found: 2, notFound: 1, errors: 0 };
    mocks.fetchAllPost.mockResolvedValue({ data: result, error: null });

    await expect(fetchAllLyrics(true)).resolves.toEqual(result);
    expect(mocks.fetchAllPost).toHaveBeenCalledWith({ retryFailed: true });
  });

  it('returns typed stats and library data', async () => {
    const rows = [
      {
        id: 'track-1',
        title: 'A Song',
        artist: 'An Artist',
        imageUrl: null,
        status: 'found' as const,
      },
    ];
    mocks.statsGet.mockResolvedValue({ data: stats, error: null });
    mocks.tracksGet.mockResolvedValue({ data: rows, error: null });

    await expect(getLyricsStats()).resolves.toEqual(stats);
    await expect(getLyricsLibrary(3, 20, 'found')).resolves.toEqual(rows);
    expect(mocks.tracksGet).toHaveBeenCalledWith({
      query: { limit: 20, offset: 40, status: 'found' },
    });
  });

  it('surfaces stats and library errors', async () => {
    mocks.statsGet.mockResolvedValue({ data: null, error: { status: 500 } });
    mocks.tracksGet.mockResolvedValue({ data: null, error: { status: 500 } });

    await expect(getLyricsStats()).rejects.toThrow('Failed to fetch lyrics stats');
    await expect(getLyricsLibrary()).rejects.toThrow('Failed to fetch lyrics library');
  });

  it('delivers only validated interpretation events', async () => {
    const body = [
      'data: {bad json}',
      'data: {"type":"delta","delta":"First "}',
      'data: {"type":"cached","interpretation":42}',
      'data: {"type":"done"}',
      '',
    ].join('\n\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    const onEvent = vi.fn();

    await interpretLyrics('track-1', onEvent);

    expect(onEvent.mock.calls.map(([event]) => event)).toEqual([
      { type: 'delta', delta: 'First ' },
      { type: 'done' },
    ]);
  });

  it('rejects a non-successful interpretation response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })));

    await expect(interpretLyrics('track-1', vi.fn())).rejects.toThrow(
      'Interpret error 503: unavailable'
    );
  });
});
