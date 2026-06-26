import type { PageLoad } from './$types';
import type { LyricsStats, LyricsStatus } from '@flows/shared';
import { getLyricsStats, getLyricsLibrary } from '@lib/flows/lyrics/api';

/** A single row in the lyrics library table, as rendered by the dashboard. */
export interface LyricsTrackRow {
  id: string;
  title: string;
  artist: string;
  imageUrl: string | null;
  status: LyricsStatus;
}

/** Shape returned by the lyrics universal loader. */
export interface LyricsPageData {
  stats: LyricsStats | null;
  tracks: LyricsTrackRow[];
  /** Deep-link target restored from `?canvasTrackId=…`, or null. */
  canvasTrackId: string | null;
  /** Set when the initial load failed; the flow renders its own error state. */
  error: string | null;
}

const LIMIT = 50;

/**
 * Universal loader for the Lyrics Dashboard.
 *
 * Performs the INITIAL stats + first-page library fetch that used to live in
 * LyricsFlow's onMount, and restores the `?canvasTrackId` deep-link from the
 * URL. Interactive actions (filtering, pagination, batch fetch, retries) stay
 * in the component and keep calling the flow's api.ts directly.
 *
 * Errors are returned (not thrown) so the flow can render its existing inline
 * error UI instead of SvelteKit's error page — behaviour-preserving.
 */
export const load: PageLoad = async ({ url }): Promise<LyricsPageData> => {
  const canvasTrackId = url.searchParams.get('canvasTrackId');

  try {
    const [stats, tracks] = await Promise.all([
      getLyricsStats(), // Stats are always global
      getLyricsLibrary(1, LIMIT),
    ]);

    return { stats, tracks, canvasTrackId, error: null };
  } catch (e) {
    return {
      stats: null,
      tracks: [],
      canvasTrackId,
      error: e instanceof Error ? e.message : 'Failed to load data',
    };
  }
};
