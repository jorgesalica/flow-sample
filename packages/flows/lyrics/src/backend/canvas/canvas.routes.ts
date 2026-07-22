import { logger } from '@flows/core';
import {
  LYRICS_CANVAS_ERROR_CODES,
  type LyricsCanvasErrorResponse,
  type LyricsCanvasNeedsAnalysisResponse,
} from '@flows/shared';
import { Elysia, t } from 'elysia';
import type {
  LyricsCanvasAnalyzeResult,
  LyricsCanvasLoadResult,
} from './service';
import {
  lyricsCanvasAnalysisSchema,
  lyricsCanvasErrorResponseSchema,
  lyricsCanvasLoadResponseSchema,
} from './transport.schemas';

const log = logger.child({ module: 'LyricsCanvasRoutes' });

export interface LyricsCanvasApplication {
  load(trackId: string): Promise<LyricsCanvasLoadResult>;
  analyze(trackId: string): Promise<LyricsCanvasAnalyzeResult>;
}

export function createCanvasRoutes(service: LyricsCanvasApplication) {
  return new Elysia({ prefix: '/:trackId/canvas' })
    .get(
      '/',
      async ({ params, set }) => {
        const result = await service.load(params.trackId);

        switch (result.kind) {
          case 'found':
            return result.analysis;
          case 'track_not_found':
            set.status = 404;
            return {
              code: LYRICS_CANVAS_ERROR_CODES.TRACK_NOT_FOUND,
              error: 'Track not found',
            } satisfies LyricsCanvasErrorResponse;
          case 'lyrics_missing':
            set.status = 404;
            return {
              code: LYRICS_CANVAS_ERROR_CODES.LYRICS_MISSING,
              error: 'Lyrics not available for this track',
            } satisfies LyricsCanvasErrorResponse;
          case 'analysis_missing':
            return {
              needsAnalysis: true,
              source: result.source,
            } satisfies LyricsCanvasNeedsAnalysisResponse;
        }
      },
      {
        params: t.Object({
          trackId: t.String(),
        }),
        response: {
          200: lyricsCanvasLoadResponseSchema,
          404: lyricsCanvasErrorResponseSchema,
        },
      },
    )
    .post(
      '/analyze',
      async ({ params, set }) => {
        try {
          const result = await service.analyze(params.trackId);

          if (result.kind === 'source_unavailable') {
            set.status = 400;
            return {
              code: LYRICS_CANVAS_ERROR_CODES.SOURCE_UNAVAILABLE,
              error: 'Track or lyrics not available',
            } satisfies LyricsCanvasErrorResponse;
          }

          return result.analysis;
        } catch (error) {
          log.error(
            {
              trackId: params.trackId,
              error: error instanceof Error ? error.message : String(error),
            },
            'Canvas analysis failed',
          );
          set.status = 503;
          return {
            code: LYRICS_CANVAS_ERROR_CODES.ANALYSIS_UNAVAILABLE,
            error: 'AI analysis is temporarily unavailable',
          } satisfies LyricsCanvasErrorResponse;
        }
      },
      {
        params: t.Object({
          trackId: t.String(),
        }),
        response: {
          200: lyricsCanvasAnalysisSchema,
          400: lyricsCanvasErrorResponseSchema,
          503: lyricsCanvasErrorResponseSchema,
        },
      },
    );
}
