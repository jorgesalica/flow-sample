import { logger } from '@flows/core';
import {
  LYRICS_STATUSES,
  type Lyrics,
  type LyricsBatchResponse,
  type LyricsLibraryTrack,
  type LyricsStats,
  type LyricsStatus,
  type TrackRepository,
} from '@flows/shared';
import { LyricsFetchError, LyricsNotFoundError } from '../domain/errors';
import type { LyricsRepository, LyricsSource, LyricsTrackParams } from '../domain/ports';

const log = logger.child({ module: 'LyricsService' });

export interface LyricsApplication {
  getLyrics(trackId: string, force?: boolean): Promise<Lyrics>;
  fetchAll(retryFailed?: boolean): Promise<LyricsBatchResponse>;
  getLibrary(limit?: number, offset?: number, status?: LyricsStatus): Promise<LyricsLibraryTrack[]>;
  getStats(): Promise<LyricsStats>;
}

export class LyricsService implements LyricsApplication {
  constructor(
    private readonly lyricsRepository: LyricsRepository,
    private readonly trackRepository: TrackRepository,
    private readonly source: LyricsSource,
  ) {}

  async getLyrics(trackId: string, force = false): Promise<Lyrics> {
    const existing = await this.lyricsRepository.findByTrackId(trackId);
    if (existing && existing.status !== LYRICS_STATUSES.PENDING && !force) {
      log.debug({ trackId, status: existing.status }, 'Returning cached lyrics');
      return existing;
    }

    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new LyricsNotFoundError(trackId, 'Track not found');

    log.info({ trackId, title: track.title, force }, 'Fetching lyrics from provider');
    let result: Awaited<ReturnType<LyricsSource['fetchLyrics']>>;
    try {
      result = await this.source.fetchLyrics({
        trackName: track.title,
        artistName: track.artists[0]?.name ?? '',
        albumName: track.album.name,
        durationSeconds: Math.round(track.durationMs / 1000),
      });
    } catch (error) {
      log.error(
        { trackId, error: error instanceof Error ? error.message : String(error) },
        'Lyrics provider request failed',
      );
      throw new LyricsFetchError('Failed to fetch lyrics', trackId);
    }

    if (result && (result.plainLyrics || result.syncedLyrics)) {
      await this.lyricsRepository.save(trackId, {
        plainLyrics: result.plainLyrics,
        syncedLyrics: result.syncedLyrics,
      });
      return {
        trackId,
        plainLyrics: result.plainLyrics,
        syncedLyrics: result.syncedLyrics,
        status: LYRICS_STATUSES.FOUND,
        fetchedAt: new Date().toISOString(),
        interpretation: null,
      };
    }

    await this.lyricsRepository.markNotFound(trackId);
    return {
      trackId,
      plainLyrics: null,
      syncedLyrics: null,
      status: LYRICS_STATUSES.NOT_FOUND,
      fetchedAt: new Date().toISOString(),
      interpretation: null,
    };
  }

  async fetchAll(retryFailed = false): Promise<LyricsBatchResponse> {
    const pendingIds = await this.lyricsRepository.getPendingTrackIds(retryFailed);
    const batch: LyricsTrackParams[] = [];
    let errors = 0;

    for (const trackId of pendingIds) {
      const track = await this.trackRepository.findById(trackId);
      if (!track) {
        errors += 1;
        continue;
      }
      batch.push({
        trackId,
        trackName: track.title,
        artistName: track.artists[0]?.name ?? '',
        albumName: track.album.name,
        durationSeconds: Math.round(track.durationMs / 1000),
      });
    }

    let results;
    try {
      results = await this.source.fetchLyricsBatch(batch);
    } catch (error) {
      log.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Lyrics batch provider request failed',
      );
      throw new LyricsFetchError('Failed to fetch lyrics batch');
    }

    let found = 0;
    let notFound = 0;
    for (const result of results) {
      if (result.error) {
        errors += 1;
      } else if (result.result && (result.result.plainLyrics || result.result.syncedLyrics)) {
        await this.lyricsRepository.save(result.trackId, {
          plainLyrics: result.result.plainLyrics,
          syncedLyrics: result.result.syncedLyrics,
        });
        found += 1;
      } else {
        await this.lyricsRepository.markNotFound(result.trackId);
        notFound += 1;
      }
    }

    log.info({ found, notFound, errors, total: pendingIds.length }, 'Batch lyrics fetch complete');
    return { processed: pendingIds.length, found, notFound, errors };
  }

  getLibrary(limit = 50, offset = 0, status?: LyricsStatus): Promise<LyricsLibraryTrack[]> {
    return this.lyricsRepository.getLibraryWithStatus(limit, offset, status);
  }

  getStats(): Promise<LyricsStats> {
    return this.lyricsRepository.getStats();
  }
}
