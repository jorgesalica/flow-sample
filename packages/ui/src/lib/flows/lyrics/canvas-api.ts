import type { CanvasAnalysis } from '@flows/shared';

const API_BASE = '/api/lyrics';

export interface CanvasStatusResponse {
  needsAnalysis: true;
  source?: {
    sourceId: string;
    sourceType: string;
    title: string;
    author: string;
    imageUrl: string | null;
  };
}

/**
 * Get the canvas analysis for a track.
 * Returns either the analysis, or a status indicating analysis is needed.
 */
export async function getCanvasAnalysis(
  trackId: string
): Promise<CanvasAnalysis | CanvasStatusResponse> {
  const res = await fetch(`${API_BASE}/${trackId}/canvas`);

  const data = (await res.json().catch(() => ({}))) as
    | CanvasAnalysis
    | CanvasStatusResponse
    | {
        error?: string;
      };

  if (!res.ok) {
    throw new Error('error' in data && data.error ? data.error : 'Failed to fetch canvas analysis');
  }

  return data as CanvasAnalysis | CanvasStatusResponse;
}

/**
 * Generate a new canvas analysis using the LLM.
 */
export async function analyzeCanvas(trackId: string): Promise<CanvasAnalysis> {
  const res = await fetch(`${API_BASE}/${trackId}/canvas/analyze`, {
    method: 'POST',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate canvas analysis');
  }

  return res.json();
}
