import type {
  Lyrics,
  LyricsBatchResponse,
  LyricsInterpretationEvent,
  LyricsLibraryTrack,
  LyricsStats,
  LyricsStatus,
} from '@flows/shared';
import { api, type ApiClient } from '@lib/client';

export async function getLyrics(
  trackId: string,
  options?: { force?: boolean },
  client: ApiClient = api
): Promise<Lyrics> {
  const { data, error } = await client.api.lyrics({ trackId }).get({
    query: { force: options?.force ? 'true' : undefined },
  });
  if (error || !data) throw new Error('Failed to fetch lyrics');
  return data;
}

export async function fetchAllLyrics(
  retryFailed = false,
  client: ApiClient = api
): Promise<LyricsBatchResponse> {
  const { data, error } = await client.api.lyrics['fetch-all'].post({ retryFailed });
  if (error || !data) throw new Error('Failed to fetch all lyrics');
  return data;
}

export async function getLyricsStats(client: ApiClient = api): Promise<LyricsStats> {
  const { data, error } = await client.api.lyrics.stats.get();
  if (error || !data) throw new Error('Failed to fetch lyrics stats');
  return data;
}

export async function getLyricsLibrary(
  page = 1,
  limit = 50,
  status?: LyricsStatus,
  client: ApiClient = api
): Promise<LyricsLibraryTrack[]> {
  const offset = (page - 1) * limit;
  const { data, error } = await client.api.lyrics.tracks.get({
    query: {
      limit,
      offset,
      ...(status ? { status } : {}),
    },
  });
  if (error || !data) throw new Error('Failed to fetch lyrics library');
  return data;
}

export type InterpretEvent = LyricsInterpretationEvent;

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
  if (!response.body) throw new Error('Interpretation stream is unavailable');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const event: unknown = JSON.parse(trimmed.slice(6));
        if (isInterpretEvent(event)) onEvent(event);
      } catch {
        // Ignore malformed provider events.
      }
    }
  }
}

function isInterpretEvent(value: unknown): value is InterpretEvent {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  switch (value.type) {
    case 'cached':
      return typeof value.interpretation === 'string';
    case 'delta':
      return typeof value.delta === 'string';
    case 'done':
      return true;
    case 'error':
      return typeof value.error === 'string';
    default:
      return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
