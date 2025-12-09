import type { Lyrics, LyricsStats } from '@flows/shared';
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
export async function fetchAllLyrics(): Promise<{
  processed: number;
  found: number;
  notFound: number;
  errors: number;
}> {
  const response = await fetch(`${API_BASE}/api/lyrics/fetch-all`, {
    method: 'POST',
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
