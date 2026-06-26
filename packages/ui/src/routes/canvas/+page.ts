import type { CanvasAnalysis } from '@flows/shared';
import { api } from '@lib/client';
import type { PageLoad } from './$types';

// SPA only — no SSR for this route.
export const ssr = false;

export interface CanvasPageData {
  canvases: CanvasAnalysis[];
}

/**
 * Universal loader for the Canvas flow.
 *
 * Fetches the initial canvas list via the typed Eden client so the page has
 * its data before the component mounts. Interactive actions (load/create/
 * delete) still run through the flow's store + api.ts.
 */
export const load: PageLoad = async (): Promise<CanvasPageData> => {
  const { data, error } = await api.api.canvas.get();

  if (error) {
    // Behaviour-preserving: a failed initial fetch yields an empty list
    // (the previous onMount path surfaced a toast and left canvases empty).
    return { canvases: [] };
  }

  return { canvases: (data ?? []) as unknown as CanvasAnalysis[] };
};
