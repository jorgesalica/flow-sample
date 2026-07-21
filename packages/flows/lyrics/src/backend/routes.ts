import { logger } from '@flows/core';
import { SQLiteTrackRepository } from '@flows/music';
import {
  LYRICS_INTERPRETATION_EVENT_TYPES,
  type LyricsErrorResponse,
  type LyricsInterpretationEvent,
} from '@flows/shared';
import { Elysia, t } from 'elysia';
import { LyricsFetchError, LyricsNotFoundError } from '../domain/errors';
import type { LyricsRepository } from '../domain/ports';
import { LrcLibAdapter } from './adapter';
import { createCanvasRoutes } from './canvas/canvas.routes';
import {
  LyricsInterpretationService,
  type LyricsInterpretationApplication,
} from './interpretation.service';
import { LyricsService, type LyricsApplication } from './lyrics.service';
import { SQLiteLyricsRepository } from './repository';
import {
  lyricsBatchResponseSchema,
  lyricsErrorResponseSchema,
  lyricsLibraryTrackSchema,
  lyricsSchema,
  lyricsStatsSchema,
  lyricsStatusSchema,
} from './schemas';

const log = logger.child({ module: 'LyricsRoutes' });
const LYRICS_PROVIDER_UNAVAILABLE = 'Lyrics provider is temporarily unavailable';
const INTERPRETATION_UNAVAILABLE = 'Lyrics interpretation is temporarily unavailable';

export interface LyricsRoutesDependencies {
  application: LyricsApplication;
  interpretation: LyricsInterpretationApplication;
  lyricsRepository: LyricsRepository;
}

export function createLyricsRouteDependencies(): LyricsRoutesDependencies {
  const lyricsRepository = new SQLiteLyricsRepository();
  const trackRepository = new SQLiteTrackRepository();
  return {
    application: new LyricsService(
      lyricsRepository,
      trackRepository,
      new LrcLibAdapter(),
    ),
    interpretation: new LyricsInterpretationService(
      lyricsRepository,
      trackRepository,
    ),
    lyricsRepository,
  };
}

export function createLyricsRoutes(
  dependencies: LyricsRoutesDependencies = createLyricsRouteDependencies(),
) {
  const { application, interpretation, lyricsRepository } = dependencies;

  return new Elysia({ prefix: '/api/lyrics' })
    .use(createCanvasRoutes(lyricsRepository))
    .get(
      '/:trackId',
      async ({ params, query, set }) => {
        try {
          return await application.getLyrics(params.trackId, query.force === 'true');
        } catch (error) {
          if (error instanceof LyricsNotFoundError) {
            set.status = 404;
            return { error: error.message };
          }
          if (error instanceof LyricsFetchError) {
            set.status = 502;
            return { error: LYRICS_PROVIDER_UNAVAILABLE };
          }
          throw error;
        }
      },
      {
        params: t.Object({ trackId: t.String() }),
        query: t.Object({
          force: t.Optional(t.Union([t.Literal('true'), t.Literal('false')])),
        }),
        response: {
          200: lyricsSchema,
          404: lyricsErrorResponseSchema,
          502: lyricsErrorResponseSchema,
        },
      },
    )
    .post(
      '/fetch-all',
      async ({ body, set }) => {
        try {
          return await application.fetchAll(body?.retryFailed ?? false);
        } catch (error) {
          if (error instanceof LyricsFetchError) {
            set.status = 502;
            return { error: LYRICS_PROVIDER_UNAVAILABLE };
          }
          throw error;
        }
      },
      {
        body: t.Optional(
          t.Object({ retryFailed: t.Optional(t.Boolean()) }),
        ),
        response: {
          200: lyricsBatchResponseSchema,
          502: lyricsErrorResponseSchema,
        },
      },
    )
    .get(
      '/tracks',
      ({ query }) => application.getLibrary(query.limit, query.offset, query.status),
      {
        query: t.Object({
          limit: t.Optional(t.Numeric({ default: 50 })),
          offset: t.Optional(t.Numeric({ default: 0 })),
          status: t.Optional(lyricsStatusSchema),
        }),
        response: { 200: t.Array(lyricsLibraryTrackSchema) },
      },
    )
    .get('/stats', () => application.getStats(), {
      response: { 200: lyricsStatsSchema },
    })
    .post(
      '/:trackId/interpret',
      async ({ params, set }) => {
        let stream: AsyncIterable<LyricsInterpretationEvent>;
        try {
          stream = await interpretation.prepareStream(params.trackId);
        } catch (error) {
          if (error instanceof LyricsNotFoundError) {
            set.status = 404;
            return { error: error.message } satisfies LyricsErrorResponse;
          }
          logProviderFailure(error, params.trackId, 'Interpretation setup failed');
          set.status = 503;
          return { error: INTERPRETATION_UNAVAILABLE } satisfies LyricsErrorResponse;
        }

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const event of stream) {
                controller.enqueue(encodeSseEvent(encoder, event));
              }
            } catch (error) {
              logProviderFailure(error, params.trackId, 'Interpretation stream failed');
              controller.enqueue(
                encodeSseEvent(encoder, {
                  type: LYRICS_INTERPRETATION_EVENT_TYPES.ERROR,
                  error: INTERPRETATION_UNAVAILABLE,
                }),
              );
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      },
      { params: t.Object({ trackId: t.String() }) },
    );
}

function encodeSseEvent(
  encoder: TextEncoder,
  event: LyricsInterpretationEvent,
): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function logProviderFailure(error: unknown, trackId: string, message: string): void {
  log.error(
    { trackId, error: error instanceof Error ? error.message : String(error) },
    message,
  );
}
