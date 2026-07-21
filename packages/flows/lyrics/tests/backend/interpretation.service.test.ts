import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LYRICS_STATUSES,
  type LyricsInterpretationEvent,
  type Track,
  type TrackRepository,
} from '@flows/shared';
import { LyricsNotFoundError } from '../../src/domain/errors';
import type { LyricsRepository } from '../../src/domain/ports';
import {
  LyricsInterpretationService,
  type LyricsInterpretationProvider,
  type LyricsInterpretationProviderFactory,
} from '../../src/backend/interpretation.service';

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

const provider: LyricsInterpretationProvider = {
  generateStream: vi.fn(),
};
const providerFactory = vi.fn<LyricsInterpretationProviderFactory>(() => provider);
const service = new LyricsInterpretationService(
  lyricsRepository,
  trackRepository,
  providerFactory,
);

async function collect(
  stream: AsyncIterable<LyricsInterpretationEvent>,
): Promise<LyricsInterpretationEvent[]> {
  const events: LyricsInterpretationEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

async function* providerEvents() {
  yield { delta: 'First ', done: false };
  yield { delta: 'second', done: false };
  yield { delta: '', done: true };
}

describe('LyricsInterpretationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    providerFactory.mockReturnValue(provider);
    vi.mocked(lyricsRepository.getInterpretation).mockResolvedValue(null);
    vi.mocked(lyricsRepository.findByTrackId).mockResolvedValue({
      trackId: track.id,
      plainLyrics: 'Song lyrics',
      syncedLyrics: null,
      status: LYRICS_STATUSES.FOUND,
      fetchedAt: '2026-01-01T00:00:00.000Z',
      interpretation: null,
    });
    vi.mocked(trackRepository.findById).mockResolvedValue(track);
    vi.mocked(provider.generateStream).mockReturnValue(providerEvents());
  });

  it('returns a cached interpretation without creating a provider', async () => {
    vi.mocked(lyricsRepository.getInterpretation).mockResolvedValue('Cached analysis');

    const stream = await service.prepareStream(track.id);

    await expect(collect(stream)).resolves.toEqual([
      { type: 'cached', interpretation: 'Cached analysis' },
    ]);
    expect(providerFactory).not.toHaveBeenCalled();
  });

  it('rejects tracks without usable lyrics before opening a stream', async () => {
    vi.mocked(lyricsRepository.findByTrackId).mockResolvedValue(null);

    await expect(service.prepareStream(track.id)).rejects.toBeInstanceOf(
      LyricsNotFoundError,
    );
    expect(providerFactory).not.toHaveBeenCalled();
  });

  it('streams typed deltas and persists the completed interpretation', async () => {
    const stream = await service.prepareStream(track.id);

    await expect(collect(stream)).resolves.toEqual([
      { type: 'delta', delta: 'First ' },
      { type: 'delta', delta: 'second' },
      { type: 'done' },
    ]);
    expect(lyricsRepository.saveInterpretation).toHaveBeenCalledWith(
      track.id,
      'First second',
    );
    expect(provider.generateStream).toHaveBeenCalledWith({
      messages: [
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('A Song'),
        }),
      ],
    });
  });

  it('propagates provider setup failures for route sanitization', async () => {
    providerFactory.mockImplementation(() => {
      throw new Error('secret provider setup detail');
    });

    await expect(service.prepareStream(track.id)).rejects.toThrow(
      'secret provider setup detail',
    );
  });
});
