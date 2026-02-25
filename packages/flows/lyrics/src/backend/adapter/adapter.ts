import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { LrcLibResponse, LyricsResult } from './types';
import { logger } from '@flows/core';

const log = logger.child({ module: 'LrcLibAdapter' });

const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const REQUEST_DELAY_MS = 150; // Delay between requests to be nice to the API

/**
 * Adapter for LrcLib lyrics API
 * https://lrclib.net/docs
 */
export class LrcLibAdapter {
  private client: AxiosInstance;
  private lastRequestTime = 0;

  constructor() {
    this.client = axios.create({
      baseURL: LRCLIB_BASE_URL,
      headers: {
        'User-Agent': 'flow-sample/1.0.0 (https://github.com/flow-sample)',
      },
    });
  }

  /**
   * Delay to avoid overwhelming the API
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch lyrics for a track by its signature (title, artist, album, duration)
   * @param params Track identification parameters
   * @returns Lyrics result or null if not found
   */
  async fetchLyrics(params: {
    trackName: string;
    artistName: string;
    albumName: string;
    durationSeconds: number;
  }): Promise<LyricsResult | null> {
    // Validation: Don't request if essential data is missing or invalid
    if (!params.trackName || params.durationSeconds <= 0) {
      log.warn(
        { trackName: params.trackName, duration: params.durationSeconds },
        'Skipping lyrics fetch: Invalid track data',
      );
      return null;
    }

    await this.throttle();

    log.debug(
      { trackName: params.trackName, artistName: params.artistName },
      'Fetching lyrics from LrcLib',
    );

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
        log.debug({ trackName: params.trackName }, 'No lyrics content in response');
        return null;
      }

      log.info(
        {
          trackName: params.trackName,
          hasPlain: !!data.plainLyrics,
          hasSynced: !!data.syncedLyrics,
        },
        'Lyrics found',
      );

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
        log.debug(
          { trackName: params.trackName, code: error.response?.status },
          'Lyrics not found (404/400)',
        );
        return null;
      }

      log.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          trackName: params.trackName,
        },
        'Failed to fetch lyrics',
      );
      throw error;
    }
  }
}
