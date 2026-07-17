import { logger } from '@flows/core';
import { Elysia, t } from 'elysia';
import type { LyricsRepository } from '../../domain/ports';
import { SQLiteLyricsCanvasRepository } from './repository';
import { LyricsCanvasService } from './service';

const log = logger.child({ module: 'LyricsCanvasRoutes' });

export function createCanvasRoutes(lyricsRepository: LyricsRepository) {
  const service = new LyricsCanvasService(new SQLiteLyricsCanvasRepository(), lyricsRepository);

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
            return { error: 'Track not found' };
          case 'lyrics_missing':
            set.status = 404;
            return { error: 'Lyrics not available for this track' };
          case 'analysis_missing':
            return {
              needsAnalysis: true,
              source: result.source,
            };
        }
      },
      {
        params: t.Object({
          trackId: t.String(),
        }),
      },
    )
    .post(
      '/analyze',
      async ({ params, set }) => {
        try {
          const result = await service.analyze(params.trackId);

          if (result.kind === 'source_unavailable') {
            set.status = 400;
            return { error: 'Track or lyrics not available' };
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
          return { error: 'AI analysis is temporarily unavailable' };
        }
      },
      {
        params: t.Object({
          trackId: t.String(),
        }),
      },
    );
}
