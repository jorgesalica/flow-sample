/**
 * Lyrics Flow Types
 */

import type { CanvasAnalysis } from './canvas.types';

export const LYRICS_STATUSES = {
  PENDING: 'pending',
  FOUND: 'found',
  NOT_FOUND: 'not_found',
} as const;

export type LyricsStatus = (typeof LYRICS_STATUSES)[keyof typeof LYRICS_STATUSES];

export interface Lyrics {
  trackId: string;
  plainLyrics: string | null;
  syncedLyrics: string | null;
  status: LyricsStatus;
  fetchedAt: string | null;
  interpretation?: string | null;
}

export interface LyricsStats {
  total: number;
  found: number;
  notFound: number;
  pending: number;
}

export interface LyricsLibraryTrack {
  id: string;
  title: string;
  artist: string;
  imageUrl: string | null;
  status: LyricsStatus;
}

export interface LyricsBatchResponse {
  processed: number;
  found: number;
  notFound: number;
  errors: number;
}

export interface LyricsErrorResponse {
  error: string;
}

export const LYRICS_CANVAS_ERROR_CODES = {
  TRACK_NOT_FOUND: 'track_not_found',
  LYRICS_MISSING: 'lyrics_missing',
  SOURCE_UNAVAILABLE: 'source_unavailable',
  ANALYSIS_UNAVAILABLE: 'analysis_unavailable',
} as const;

export type LyricsCanvasErrorCode =
  (typeof LYRICS_CANVAS_ERROR_CODES)[keyof typeof LYRICS_CANVAS_ERROR_CODES];

export interface LyricsCanvasSource {
  sourceId: string;
  sourceType: 'track';
  title: string;
  author: string;
  imageUrl: string | null;
}

export interface LyricsCanvasNeedsAnalysisResponse {
  needsAnalysis: true;
  source: LyricsCanvasSource;
}

export type LyricsCanvasLoadResponse = CanvasAnalysis | LyricsCanvasNeedsAnalysisResponse;

export interface LyricsCanvasErrorResponse {
  code: LyricsCanvasErrorCode;
  error: string;
}

export const LYRICS_INTERPRETATION_EVENT_TYPES = {
  CACHED: 'cached',
  DELTA: 'delta',
  DONE: 'done',
  ERROR: 'error',
} as const;

export type LyricsInterpretationEvent =
  | {
      type: typeof LYRICS_INTERPRETATION_EVENT_TYPES.CACHED;
      interpretation: string;
    }
  | { type: typeof LYRICS_INTERPRETATION_EVENT_TYPES.DELTA; delta: string }
  | { type: typeof LYRICS_INTERPRETATION_EVENT_TYPES.DONE }
  | { type: typeof LYRICS_INTERPRETATION_EVENT_TYPES.ERROR; error: string };
