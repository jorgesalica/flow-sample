import type { Lyrics, LyricsStats, LyricsStatus } from '@flows/shared';
import { API_BASE } from './config';

/**
 * Fetch lyrics for a specific track
 * Will fetch from LrcLib if not cached or forced
 */
export async function getLyrics(trackId: string, options?: { force?: boolean }): Promise<Lyrics> {
  const params = new URLSearchParams();
  if (options?.force) {
    params.append('force', 'true');
  }

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/api/lyrics/${trackId}${queryString}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch lyrics: ${response.statusText}`);
  }

  return response.json();
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
  const response = await fetch(`${API_BASE}/api/lyrics/fetch-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ retryFailed }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch all lyrics: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get lyrics statistics
 */
export async function getLyricsStats(): Promise<LyricsStats> {
  const response = await fetch(`${API_BASE}/api/lyrics/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch lyrics stats: ${response.statusText}`);
  }

  return response.json();
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
  let url = `${API_BASE}/api/lyrics/tracks?limit=${limit}&offset=${offset}`;

  if (status) {
    url += `&status=${status}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch lyrics library: ${response.statusText}`);
  }

  return response.json();
}
