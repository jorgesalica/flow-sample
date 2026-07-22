import type {
  CanvasAnalysis,
  LyricsCanvasErrorResponse,
  LyricsCanvasLoadResponse,
} from '@flows/shared';
import { api, type ApiClient } from '@lib/client';

/**
 * Get the canvas analysis for a track.
 * Returns either the analysis, or a status indicating analysis is needed.
 */
export async function getCanvasAnalysis(
  trackId: string,
  client: ApiClient = api
): Promise<LyricsCanvasLoadResponse> {
  const { data, error } = await client.api.lyrics({ trackId }).canvas.get();
  if (error) {
    throw new Error(readCanvasError(error.value) ?? 'Failed to fetch canvas analysis');
  }
  if (!data) throw new Error('Failed to fetch canvas analysis');
  if ('error' in data) {
    throw new Error(readCanvasError(data) ?? 'Failed to fetch canvas analysis');
  }
  if ('needsAnalysis' in data) {
    return { needsAnalysis: true, source: data.source };
  }
  return data;
}

/**
 * Generate a new canvas analysis using the LLM.
 */
export async function analyzeCanvas(
  trackId: string,
  client: ApiClient = api
): Promise<CanvasAnalysis> {
  const { data, error } = await client.api.lyrics({ trackId }).canvas.analyze.post();
  if (error) {
    throw new Error(readCanvasError(error.value) ?? 'Failed to generate canvas analysis');
  }
  if (!data) throw new Error('Failed to generate canvas analysis');
  if ('error' in data) {
    throw new Error(readCanvasError(data) ?? 'Failed to generate canvas analysis');
  }
  return data;
}

function readCanvasError(value: unknown): LyricsCanvasErrorResponse['error'] | undefined {
  if (typeof value !== 'object' || value === null || !('error' in value)) return undefined;
  return typeof value.error === 'string' ? value.error : undefined;
}
