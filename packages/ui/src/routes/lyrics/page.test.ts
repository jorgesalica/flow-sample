import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LyricsStats } from '@flows/shared';
import { load, type LyricsTrackRow, type LyricsPageData } from './+page';

// Mock the flow's data edge. The loader pulls the INITIAL stats + first page of
// the library from here; everything else (filters, pagination, mutations) stays
// in the component.
const getLyricsStats = vi.fn();
const getLyricsLibrary = vi.fn();
const clientMocks = vi.hoisted(() => ({
  requestApi: { scope: 'request' },
  createApiClient: vi.fn(),
}));
vi.mock('@lib/client', () => ({
  createApiClient: (requestFetch: typeof fetch) => {
    clientMocks.createApiClient(requestFetch);
    return clientMocks.requestApi;
  },
}));
vi.mock('@lib/flows/lyrics/api', () => ({
  getLyricsStats: (...a: unknown[]) => getLyricsStats(...a),
  getLyricsLibrary: (...a: unknown[]) => getLyricsLibrary(...a),
}));

function makeStats(overrides: Partial<LyricsStats> = {}): LyricsStats {
  return { total: 10, found: 6, notFound: 2, pending: 2, ...overrides };
}

function makeRow(overrides: Partial<LyricsTrackRow> = {}): LyricsTrackRow {
  return {
    id: 'track-1',
    title: 'Test Title',
    artist: 'Test Artist',
    imageUrl: 'https://img.example/cover.jpg',
    status: 'found',
    ...overrides,
  };
}

// Minimal stand-in for the SvelteKit load event — the loader only reads `url`.
const requestFetch = vi.fn();

function makeEvent(search = '') {
  return {
    url: new URL(`http://localhost/lyrics${search}`),
    fetch: requestFetch,
  } as unknown as Parameters<typeof load>[0];
}

describe('lyrics +page load', () => {
  beforeEach(() => {
    getLyricsStats.mockReset();
    getLyricsLibrary.mockReset();
    clientMocks.createApiClient.mockReset();
    requestFetch.mockReset();
  });

  it('returns the global stats and the first page of tracks', async () => {
    const stats = makeStats();
    const tracks = [makeRow(), makeRow({ id: 'track-2', title: 'Second' })];
    getLyricsStats.mockResolvedValue(stats);
    getLyricsLibrary.mockResolvedValue(tracks);

    const result = await load(makeEvent());

    expect(result).toEqual({
      stats,
      tracks,
      canvasTrackId: null,
      error: null,
    });
  });

  it('fetches the first page (page 1, limit 50) with no status filter', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);

    await load(makeEvent());

    expect(clientMocks.createApiClient).toHaveBeenCalledWith(requestFetch);
    expect(getLyricsStats).toHaveBeenCalledWith(clientMocks.requestApi);
    expect(getLyricsLibrary).toHaveBeenCalledWith(1, 50, undefined, clientMocks.requestApi);
  });

  it('restores the canvasTrackId deep-link from the URL', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockResolvedValue([makeRow()]);

    const result = (await load(makeEvent('?canvasTrackId=track-99'))) as LyricsPageData;

    expect(result.canvasTrackId).toBe('track-99');
  });

  it('returns an error message (and empty data) when the stats fetch rejects', async () => {
    getLyricsStats.mockRejectedValue(new Error('Backend exploded'));
    getLyricsLibrary.mockResolvedValue([makeRow()]);

    const result = (await load(makeEvent())) as LyricsPageData;

    expect(result.error).toBe('Backend exploded');
    expect(result.stats).toBeNull();
    expect(result.tracks).toEqual([]);
  });

  it('returns an error message when the library fetch rejects', async () => {
    getLyricsStats.mockResolvedValue(makeStats());
    getLyricsLibrary.mockRejectedValue(new Error('Library down'));

    const result = (await load(makeEvent())) as LyricsPageData;

    expect(result.error).toBe('Library down');
    expect(result.stats).toBeNull();
    expect(result.tracks).toEqual([]);
  });

  it('preserves the canvasTrackId deep-link even when the load fails', async () => {
    getLyricsStats.mockRejectedValue(new Error('boom'));
    getLyricsLibrary.mockRejectedValue(new Error('boom'));

    const result = (await load(makeEvent('?canvasTrackId=track-99'))) as LyricsPageData;

    expect(result.canvasTrackId).toBe('track-99');
    expect(result.error).toBe('boom');
  });

  it('falls back to a generic error message for a non-Error rejection', async () => {
    getLyricsStats.mockRejectedValue('weird');
    getLyricsLibrary.mockResolvedValue([makeRow()]);

    const result = (await load(makeEvent())) as LyricsPageData;

    expect(result.error).toBe('Failed to load data');
  });
});
