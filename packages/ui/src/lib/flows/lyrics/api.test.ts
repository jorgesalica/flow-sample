import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Lyrics, LyricsStats, LyricsStatus } from '@flows/shared';
import {
  getLyrics,
  fetchAllLyrics,
  getLyricsStats,
  getLyricsLibrary,
  interpretLyrics,
  type InterpretEvent,
} from './api';

// Mock the Eden client edge — getLyricsStats / getLyricsLibrary go through it.
const statsGet = vi.fn();
const tracksGet = vi.fn();
vi.mock('@lib/client', () => ({
  api: {
    api: {
      lyrics: {
        stats: { get: () => statsGet() },
        tracks: { get: (args: unknown) => tracksGet(args) },
      },
    },
  },
}));

// ── Fixtures ──────────────────────────────────────────────────
const LYRICS_STATUS_FOUND: LyricsStatus = 'found';

function makeStats(overrides: Partial<LyricsStats> = {}): LyricsStats {
  return { total: 10, found: 6, notFound: 2, pending: 2, ...overrides };
}

function makeLibraryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'track-1',
    title: 'Test Title',
    artist: 'Test Artist',
    imageUrl: 'https://img.example/cover.jpg',
    status: LYRICS_STATUS_FOUND,
    ...overrides,
  };
}

function makeLyrics(overrides: Partial<Lyrics> = {}): Lyrics {
  return {
    trackId: 'track-1',
    plainLyrics: 'la la la',
    syncedLyrics: null,
    status: LYRICS_STATUS_FOUND,
    fetchedAt: '2024-01-01T00:00:00.000Z',
    interpretation: null,
    ...overrides,
  };
}

// Helper to build a fetch Response-ish stub for plain-fetch endpoints.
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response;
}

describe('lyrics api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getLyrics', () => {
    it('fetches lyrics for a track without force by default', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(makeLyrics()));

      const result = await getLyrics('track-1');

      expect(fetch).toHaveBeenCalledWith('/api/lyrics/track-1');
      expect(result.plainLyrics).toBe('la la la');
    });

    it('appends ?force=true when force option is set', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(makeLyrics()));

      await getLyrics('track-1', { force: true });

      expect(fetch).toHaveBeenCalledWith('/api/lyrics/track-1?force=true');
    });

    it('does NOT append a query string when force is false', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(makeLyrics()));

      await getLyrics('track-1', { force: false });

      expect(fetch).toHaveBeenCalledWith('/api/lyrics/track-1');
    });

    it('throws when the response is not ok', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({}, { ok: false, status: 500 })
      );

      await expect(getLyrics('track-1')).rejects.toThrow('Failed to fetch lyrics');
    });
  });

  describe('fetchAllLyrics', () => {
    it('POSTs with retryFailed:false by default', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ processed: 3, found: 2, notFound: 1, errors: 0 })
      );

      const result = await fetchAllLyrics();

      expect(fetch).toHaveBeenCalledWith('/api/lyrics/fetch-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retryFailed: false }),
      });
      expect(result).toEqual({ processed: 3, found: 2, notFound: 1, errors: 0 });
    });

    it('passes retryFailed:true through the body', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ processed: 0, found: 0, notFound: 0, errors: 0 })
      );

      await fetchAllLyrics(true);

      const body = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body;
      expect(JSON.parse(body)).toEqual({ retryFailed: true });
    });

    it('throws when the response is not ok', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({}, { ok: false, status: 502 })
      );

      await expect(fetchAllLyrics()).rejects.toThrow('Failed to fetch all lyrics');
    });
  });

  describe('getLyricsStats', () => {
    it('returns stats data from the Eden client', async () => {
      statsGet.mockResolvedValue({ data: makeStats(), error: null });

      const result = await getLyricsStats();

      expect(result).toEqual(makeStats());
    });

    it('throws when the Eden client returns an error', async () => {
      statsGet.mockResolvedValue({ data: null, error: { status: 500 } });

      await expect(getLyricsStats()).rejects.toThrow('Failed to fetch lyrics stats');
    });
  });

  describe('getLyricsLibrary', () => {
    it('translates page/limit into limit+offset query params (page 1 → offset 0)', async () => {
      tracksGet.mockResolvedValue({ data: [makeLibraryRow()], error: null });

      const result = await getLyricsLibrary(1, 50);

      expect(tracksGet).toHaveBeenCalledWith({ query: { limit: '50', offset: '0' } });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('track-1');
    });

    it('computes offset for later pages', async () => {
      tracksGet.mockResolvedValue({ data: [], error: null });

      await getLyricsLibrary(3, 20);

      expect(tracksGet).toHaveBeenCalledWith({ query: { limit: '20', offset: '40' } });
    });

    it('includes the status filter only when provided', async () => {
      tracksGet.mockResolvedValue({ data: [], error: null });

      await getLyricsLibrary(1, 50, 'not_found');

      expect(tracksGet).toHaveBeenCalledWith({
        query: { limit: '50', offset: '0', status: 'not_found' },
      });
    });

    it('omits the status key when no filter is given', async () => {
      tracksGet.mockResolvedValue({ data: [], error: null });

      await getLyricsLibrary(1, 50);

      const queryArg = tracksGet.mock.calls[0][0].query;
      expect(queryArg).not.toHaveProperty('status');
    });

    it('throws when the Eden client returns an error', async () => {
      tracksGet.mockResolvedValue({ data: null, error: { status: 500 } });

      await expect(getLyricsLibrary()).rejects.toThrow('Failed to fetch lyrics library');
    });
  });

  describe('interpretLyrics (SSE parsing)', () => {
    // Build a ReadableStream-like reader yielding the given chunks as bytes.
    function streamOf(chunks: string[]) {
      const encoder = new TextEncoder();
      let i = 0;
      return {
        body: {
          getReader: () => ({
            read: () =>
              i < chunks.length
                ? Promise.resolve({ done: false, value: encoder.encode(chunks[i++]) })
                : Promise.resolve({ done: true, value: undefined }),
          }),
        },
        ok: true,
        status: 200,
      } as unknown as Response;
    }

    it('parses well-formed SSE events and forwards them in order', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        streamOf([
          'data: {"type":"delta","delta":"Hello "}\n\n',
          'data: {"type":"delta","delta":"world"}\n\ndata: {"type":"done"}\n\n',
        ])
      );

      const events: InterpretEvent[] = [];
      await interpretLyrics('track-1', (e) => events.push(e));

      expect(fetch).toHaveBeenCalledWith('/api/lyrics/track-1/interpret', { method: 'POST' });
      expect(events).toEqual([
        { type: 'delta', delta: 'Hello ' },
        { type: 'delta', delta: 'world' },
        { type: 'done' },
      ]);
    });

    it('emits a cached event when the stream returns one', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        streamOf(['data: {"type":"cached","interpretation":"It is about loss."}\n\n'])
      );

      const events: InterpretEvent[] = [];
      await interpretLyrics('track-1', (e) => events.push(e));

      expect(events).toEqual([{ type: 'cached', interpretation: 'It is about loss.' }]);
    });

    it('skips malformed SSE lines without throwing', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        streamOf([
          'data: not-json\n\n',
          'data: {"type":"delta","delta":"ok"}\n\n',
          ': comment line\n\n',
        ])
      );

      const events: InterpretEvent[] = [];
      await interpretLyrics('track-1', (e) => events.push(e));

      expect(events).toEqual([{ type: 'delta', delta: 'ok' }]);
    });

    it('throws with status and body when the response is not ok', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse('boom', { ok: false, status: 429 })
      );

      await expect(interpretLyrics('track-1', () => {})).rejects.toThrow(
        'Interpret error 429: boom'
      );
    });
  });
});
