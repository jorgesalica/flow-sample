import type { Lyrics, LyricsStats, LyricsStatus } from '@flows/shared';
import { api } from '@lib/client';

/**
 * Fetch lyrics for a specific track
 * Uses plain fetch because Eden can't type dynamic route params ([trackId])
 */
export async function getLyrics(trackId: string, options?: { force?: boolean }): Promise<Lyrics> {
  const params = new URLSearchParams();
  if (options?.force) params.append('force', 'true');
  const queryString = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(`/api/lyrics/${trackId}${queryString}`);
  if (!response.ok) throw new Error('Failed to fetch lyrics');
  return response.json() as Promise<Lyrics>;
}

/**
 * Batch fetch all pending lyrics
 * Uses plain fetch because 'fetch-all' contains a hyphen which Eden can't resolve
 */
export async function fetchAllLyrics(retryFailed = false): Promise<{
  processed: number;
  found: number;
  notFound: number;
  errors: number;
}> {
  const response = await fetch('/api/lyrics/fetch-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ retryFailed }),
  });

  if (!response.ok) throw new Error('Failed to fetch all lyrics');
  return response.json();
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
  status?: LyricsStatus
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
