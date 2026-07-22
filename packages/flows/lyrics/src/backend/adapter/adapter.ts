import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { LrcLibResponse } from './types';
import { logger } from '@flows/core';
import type {
  LyricsSource,
  LyricsResult,
  LyricsTrackParams,
  BatchLyricsResult,
} from '../../domain/ports';

// Re-exported for backward compatibility with existing importers.
export type { LyricsTrackParams, BatchLyricsResult } from '../../domain/ports';

const log = logger.child({ module: 'LrcLibAdapter' });

const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const DEFAULT_CONCURRENCY = 10;

/**
 * Adapter for LrcLib lyrics API
 * https://lrclib.net/docs
 */
export class LrcLibAdapter implements LyricsSource {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: LRCLIB_BASE_URL,
      timeout: 10000,
      headers: {
        'User-Agent': 'flow-sample/1.0.0 (https://github.com/flow-sample)',
      },
    });
  }

  /**
   * Fetch lyrics for a single track
   */
  async fetchLyrics(params: {
    trackName: string;
    artistName: string;
    albumName: string;
    durationSeconds: number;
  }): Promise<LyricsResult | null> {
    if (!params.trackName || params.durationSeconds <= 0) {
      return null;
    }

    try {
      const response = await this.client.get<LrcLibResponse>('/get', {
        params: {
          track_name: params.trackName,
          artist_name: params.artistName,
          album_name: params.albumName,
          duration: params.durationSeconds,
        },
      });

      const data = response.data;

      if (!data.plainLyrics && !data.syncedLyrics) {
        return null;
      }

      return {
        plainLyrics: data.plainLyrics,
        syncedLyrics: data.syncedLyrics,
        instrumental: data.instrumental,
      };
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 400)
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch lyrics for multiple tracks concurrently using a semaphore pool.
   * Default concurrency is 10 parallel requests.
   */
  async fetchLyricsBatch(
    tracks: LyricsTrackParams[],
    onProgress?: (completed: number, total: number) => void,
    concurrency: number = DEFAULT_CONCURRENCY,
  ): Promise<BatchLyricsResult[]> {
    log.info({ total: tracks.length, concurrency }, 'Starting batch lyrics fetch');

    const results: BatchLyricsResult[] = [];
    let completed = 0;
    let running = 0;
    let index = 0;
    let lastLoggedPct = 0;

    return new Promise((resolve) => {
      const next = () => {
        // All done
        if (completed === tracks.length) {
          resolve(results);
          return;
        }

        // Launch tasks up to concurrency limit
        while (running < concurrency && index < tracks.length) {
          const track = tracks[index++];
          running++;

          this.fetchLyrics({
            trackName: track.trackName,
            artistName: track.artistName,
            albumName: track.albumName,
            durationSeconds: track.durationSeconds,
          })
            .then((result) => {
              results.push({ trackId: track.trackId, result });
            })
            .catch((error) => {
              results.push({
                trackId: track.trackId,
                result: null,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            })
            .finally(() => {
              running--;
              completed++;

              const pct = Math.floor((completed / tracks.length) * 100);
              if (pct >= lastLoggedPct + 5 || completed === tracks.length) {
                log.info(
                  { progress: `${pct}%`, completed, total: tracks.length },
                  'Lyrics fetch progress',
                );
                lastLoggedPct = pct;
              }

              if (onProgress) onProgress(completed, tracks.length);
              next();
            });
        }
      };

      next();
    });
  }
}
