import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LYRICS_STATUSES, type Lyrics, type LyricsInterpretationEvent } from '@flows/shared';
import { LyricsFetchError, LyricsNotFoundError } from '../../src/domain/errors';
import type { LyricsRepository } from '../../src/domain/ports';
import type { LyricsApplication } from '../../src/backend/lyrics.service';
import type { LyricsInterpretationApplication } from '../../src/backend/interpretation.service';
import type { LyricsCanvasApplication } from '../../src/backend/canvas/canvas.routes';

const logError = vi.hoisted(() => vi.fn());

vi.mock('@flows/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@flows/core')>();
  return {
    ...original,
    logger: {
      child: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: logError,
      }),
    },
  };
});

const { createLyricsRoutes } = await import('../../src/backend/routes');

const lyrics: Lyrics = {
  trackId: 'track-1',
  plainLyrics: 'Song lyrics',
  syncedLyrics: null,
  status: LYRICS_STATUSES.FOUND,
  fetchedAt: '2026-01-01T00:00:00.000Z',
  interpretation: null,
};

const application = {
  getLyrics: vi.fn<LyricsApplication['getLyrics']>(),
  fetchAll: vi.fn<LyricsApplication['fetchAll']>(),
  getLibrary: vi.fn<LyricsApplication['getLibrary']>(),
  getStats: vi.fn<LyricsApplication['getStats']>(),
};

const interpretation = {
  prepareStream: vi.fn<LyricsInterpretationApplication['prepareStream']>(),
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

const canvas: LyricsCanvasApplication = {
  load: vi.fn(),
  analyze: vi.fn(),
};

function request(path: string, init?: RequestInit): Promise<Response> {
  return createLyricsRoutes({
    application,
    interpretation,
    lyricsRepository,
    canvas,
  }).handle(new Request(`http://localhost${path}`, init));
}

function post(path: string, body?: Record<string, unknown>): Promise<Response> {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function* streamEvents(
  events: LyricsInterpretationEvent[],
): AsyncGenerator<LyricsInterpretationEvent> {
  for (const event of events) yield event;
}

async function* failingStream(): AsyncGenerator<LyricsInterpretationEvent> {
  throw new Error('secret provider stream detail');
}

function parseSse(text: string): Array<Record<string, unknown>> {
  return text
    .trim()
    .split('\n\n')
    .map((line) => JSON.parse(line.replace(/^data: /, '')) as Record<string, unknown>);
}

describe('Lyrics routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    application.getLyrics.mockResolvedValue(lyrics);
    application.fetchAll.mockResolvedValue({
      processed: 2,
      found: 1,
      notFound: 1,
      errors: 0,
    });
    application.getLibrary.mockResolvedValue([
      {
        id: lyrics.trackId,
        title: 'A Song',
        artist: 'An Artist',
        imageUrl: null,
        status: LYRICS_STATUSES.FOUND,
      },
    ]);
    application.getStats.mockResolvedValue({
      total: 1,
      found: 1,
      notFound: 0,
      pending: 0,
    });
    interpretation.prepareStream.mockResolvedValue(
      streamEvents([{ type: 'delta', delta: 'Analysis' }, { type: 'done' }]),
    );
  });

  it('delegates individual fetches with a validated force flag', async () => {
    const response = await request('/api/lyrics/track-1?force=true');

    expect(response.status).toBe(200);
    expect(application.getLyrics).toHaveBeenCalledWith('track-1', true);
    await expect(response.json()).resolves.toEqual(lyrics);
  });

  it('maps missing tracks and provider failures to stable responses', async () => {
    application.getLyrics.mockRejectedValueOnce(
      new LyricsNotFoundError('missing', 'Track not found'),
    );
    const missing = await request('/api/lyrics/missing');
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'Track not found' });

    application.getLyrics.mockRejectedValueOnce(
      new LyricsFetchError('secret provider detail', 'track-1'),
    );
    const unavailable = await request('/api/lyrics/track-1');
    expect(unavailable.status).toBe(502);
    const body = await unavailable.json();
    expect(body).toEqual({ error: 'Lyrics provider is temporarily unavailable' });
    expect(JSON.stringify(body)).not.toContain('secret provider detail');
  });

  it('passes retryFailed into batch orchestration', async () => {
    const response = await post('/api/lyrics/fetch-all', { retryFailed: true });

    expect(response.status).toBe(200);
    expect(application.fetchAll).toHaveBeenCalledWith(true);
    await expect(response.json()).resolves.toEqual({
      processed: 2,
      found: 1,
      notFound: 1,
      errors: 0,
    });
  });

  it('maps a rejected batch provider request to 502', async () => {
    application.fetchAll.mockRejectedValue(new LyricsFetchError('secret provider detail'));

    const response = await post('/api/lyrics/fetch-all');

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'Lyrics provider is temporarily unavailable',
    });
  });

  it('delegates typed library and stats queries', async () => {
    const tracks = await request('/api/lyrics/tracks?limit=10&offset=20&status=found');
    const stats = await request('/api/lyrics/stats');

    expect(application.getLibrary).toHaveBeenCalledWith(10, 20, 'found');
    expect(tracks.status).toBe(200);
    expect(stats.status).toBe(200);
    await expect(stats.json()).resolves.toEqual({
      total: 1,
      found: 1,
      notFound: 0,
      pending: 0,
    });
  });

  it('serializes typed interpretation events as SSE', async () => {
    const response = await post('/api/lyrics/track-1/interpret');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(parseSse(await response.text())).toEqual([
      { type: 'delta', delta: 'Analysis' },
      { type: 'done' },
    ]);
  });

  it('returns 404 before opening SSE when lyrics are unavailable', async () => {
    interpretation.prepareStream.mockRejectedValue(
      new LyricsNotFoundError('missing', 'Lyrics not found for this track'),
    );

    const response = await post('/api/lyrics/missing/interpret');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Lyrics not found for this track',
    });
  });

  it('sanitizes interpretation setup and established stream failures', async () => {
    interpretation.prepareStream.mockRejectedValueOnce(new Error('secret provider setup detail'));
    const setup = await post('/api/lyrics/track-1/interpret');
    expect(setup.status).toBe(503);
    await expect(setup.json()).resolves.toEqual({
      error: 'Lyrics interpretation is temporarily unavailable',
    });

    interpretation.prepareStream.mockResolvedValueOnce(failingStream());
    const established = await post('/api/lyrics/track-1/interpret');
    const body = await established.text();
    expect(parseSse(body)).toEqual([
      {
        type: 'error',
        error: 'Lyrics interpretation is temporarily unavailable',
      },
    ]);
    expect(body).not.toContain('secret provider stream detail');
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ trackId: 'track-1' }),
      'Interpretation stream failed',
    );
  });
});
