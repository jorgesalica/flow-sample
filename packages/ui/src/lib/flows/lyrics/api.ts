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

/** SSE event types from the interpret endpoint. */
export type InterpretEvent =
  | { type: 'cached'; interpretation: string }
  | { type: 'delta'; delta: string }
  | { type: 'done' }
  | { type: 'error'; error: string };

/**
 * Stream an AI interpretation for a track's lyrics.
 * Calls a callback for each SSE event as it arrives.
 */
export async function interpretLyrics(
  trackId: string,
  onEvent: (event: InterpretEvent) => void
): Promise<void> {
  const response = await fetch(`/api/lyrics/${trackId}/interpret`, {
    method: 'POST',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Interpret error ${response.status}: ${text}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const event = JSON.parse(trimmed.slice(6)) as InterpretEvent;
        onEvent(event);
      } catch {
        // skip malformed SSE
      }
    }
  }
}

