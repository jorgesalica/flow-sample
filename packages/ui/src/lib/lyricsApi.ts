import type { Lyrics, LyricsStats, LyricsStatus } from '@flows/shared';
import { api } from './client';

/**
 * Fetch lyrics for a specific track
 * Will fetch from LrcLib if not cached or forced
 */
export async function getLyrics(trackId: string, options?: { force?: boolean }): Promise<Lyrics> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (api.api.lyrics as any)[trackId].get({
    query: options?.force ? { force: 'true' } : undefined,
  });

  if (error) throw new Error('Failed to fetch lyrics');
  return data as Lyrics;
}

/**
 * Batch fetch all pending lyrics
 */
export async function fetchAllLyrics(retryFailed = false): Promise<{
  processed: number;
  found: number;
  notFound: number;
  errors: number;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (api.api.lyrics as any)['fetch-all'].post({
    retryFailed,
  });

  if (error) throw new Error('Failed to fetch all lyrics');
  return data as { processed: number; found: number; notFound: number; errors: number };
}

/**
 * Get lyrics statistics
 */
export async function getLyricsStats(): Promise<LyricsStats> {
  const { data, error } = await api.api.lyrics.stats.get();

  if (error) throw new Error('Failed to fetch lyrics stats');
  return data as unknown as LyricsStats;
}

/**
 * Get library tracks with lyrics status
 */
export async function getLyricsLibrary(
  page = 1,
  limit = 50,
  status?: LyricsStatus,
): Promise<
  Array<{
    id: string;
    title: string;
    artist: string;
    imageUrl: string | null;
    status: LyricsStatus;
  }>
> {
  const offset = (page - 1) * limit;
  const { data, error } = await api.api.lyrics.tracks.get({
    query: {
      limit: limit.toString(),
      offset: offset.toString(),
      ...(status ? { status } : {}),
    },
  });

  if (error) throw new Error('Failed to fetch lyrics library');
  return data as unknown as Array<{
    id: string;
    title: string;
    artist: string;
    imageUrl: string | null;
    status: LyricsStatus;
  }>;
}
