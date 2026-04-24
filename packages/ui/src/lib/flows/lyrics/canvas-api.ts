import type { CanvasAnalysis } from '@flows/shared';

const API_BASE = '/api/lyrics';

export interface CanvasStatusResponse {
    error?: string;
    needsAnalysis?: boolean;
    source?: {
        sourceId: string;
        sourceType: string;
        title: string;
        author: string;
        imageUrl: string;
    }
}

/**
 * Get the canvas analysis for a track.
 * Returns either the analysis, or a status indicating analysis is needed.
 */
export async function getCanvasAnalysis(trackId: string): Promise<CanvasAnalysis | CanvasStatusResponse> {
    const res = await fetch(`${API_BASE}/${trackId}/canvas`);
    
    if (!res.ok && res.status !== 404) {
        throw new Error('Failed to fetch canvas analysis');
    }
    
    return res.json();
}

/**
 * Generate a new canvas analysis using the LLM.
 */
export async function analyzeCanvas(trackId: string): Promise<CanvasAnalysis> {
    const res = await fetch(`${API_BASE}/${trackId}/canvas/analyze`, {
        method: 'POST'
    });
    
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate canvas analysis');
    }
    
    return res.json();
}
