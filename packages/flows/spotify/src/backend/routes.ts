import { logger } from '@flows/core';
import type { SpotifyErrorResponse } from '@flows/shared';
import { Elysia, t } from 'elysia';
import { SpotifyAuthError, SpotifyRateLimitError } from '../domain/errors';
import type { SpotifyRoutesConfig } from './config';
import {
  spotifyAuthStatusSchema,
  spotifyErrorResponseSchema,
  spotifyGenreCountSchema,
  spotifyPaginatedTracksSchema,
  spotifySearchQuerySchema,
  spotifyStatsSchema,
  spotifySyncResponseSchema,
  spotifyTrackSchema,
  spotifyYearCountSchema,
} from './schemas';
import {
  createSpotifyService,
  type SpotifyApplication,
} from './spotify.service';

export type { SpotifyRoutesConfig } from './config';

const log = logger.child({ module: 'SpotifyRoutes' });
const AUTH_REQUIRED = 'Spotify authorization is required';
const RATE_LIMITED = 'Spotify rate limit reached';
const PROVIDER_UNAVAILABLE = 'Spotify is temporarily unavailable';

export function createSpotifyRoutes(
  config: SpotifyRoutesConfig,
  service: SpotifyApplication = createSpotifyService(config),
) {
  return new Elysia({ prefix: '/api/spotify' })
    .get('/auth/login', () => Response.redirect(service.getAuthorizationUrl(), 302))
    .get(
      '/auth/callback',
      async ({ query, set }) => {
        if (!query.code) {
          set.status = 400;
          return { error: 'No code provided' };
        }

        try {
          await service.exchangeCode(query.code);
          return Response.redirect(service.getSuccessUrl(), 302);
        } catch (error) {
          logExternalFailure(error, 'Failed to exchange Spotify auth code');
          set.status = 502;
          return { error: PROVIDER_UNAVAILABLE };
        }
      },
      {
        query: t.Object({
          code: t.Optional(t.String()),
          state: t.Optional(t.String()),
        }),
      },
    )
    .get('/auth/status', () => service.getAuthStatus(), {
      response: { 200: spotifyAuthStatusSchema },
    })
    .post(
      '/run',
      async ({ body, set }) => {
        try {
          return await service.sync(body?.limit);
        } catch (error) {
          const failure = classifySpotifyFailure(error);
          logExternalFailure(error, 'Spotify sync failed');
          set.status = failure.status;
          if (failure.retryAfterSeconds !== undefined) {
            set.headers['Retry-After'] = String(failure.retryAfterSeconds);
          }
          return failure.body;
        }
      },
      {
        body: t.Optional(
          t.Object({
            limit: t.Optional(t.Integer({ minimum: 1 })),
          }),
        ),
        response: {
          200: spotifySyncResponseSchema,
          401: spotifyErrorResponseSchema,
          429: spotifyErrorResponseSchema,
          502: spotifyErrorResponseSchema,
        },
      },
    )
    .get('/tracks', () => service.getTracks(), {
      response: { 200: t.Array(spotifyTrackSchema) },
    })
    .get(
      '/tracks/search',
      ({ query }) => service.searchTracks(query),
      {
        query: spotifySearchQuerySchema,
        response: { 200: spotifyPaginatedTracksSchema },
      },
    )
    .get(
      '/tracks/:id',
      async ({ params, set }) => {
        const track = await service.getTrack(params.id);
        if (!track) {
          set.status = 404;
          return { error: 'Track not found' };
        }
        return track;
      },
      {
        params: t.Object({ id: t.String() }),
        response: {
          200: spotifyTrackSchema,
          404: spotifyErrorResponseSchema,
        },
      },
    )
    .get('/count', async () => ({ count: await service.getTrackCount() }), {
      response: { 200: t.Object({ count: t.Number() }) },
    })
    .get('/genres', () => service.getGenres(), {
      response: { 200: t.Array(spotifyGenreCountSchema) },
    })
    .get('/years', () => service.getYears(), {
      response: { 200: t.Array(spotifyYearCountSchema) },
    })
    .get('/stats', () => service.getStats(), {
      response: { 200: spotifyStatsSchema },
    });
}

function classifySpotifyFailure(error: unknown): {
  status: 401 | 429 | 502;
  body: SpotifyErrorResponse;
  retryAfterSeconds?: number;
} {
  if (error instanceof SpotifyAuthError) {
    return { status: 401, body: { error: AUTH_REQUIRED } };
  }
  if (error instanceof SpotifyRateLimitError) {
    return {
      status: 429,
      body: { error: RATE_LIMITED, retryAfterSeconds: error.retryAfterSeconds },
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  return { status: 502, body: { error: PROVIDER_UNAVAILABLE } };
}

function logExternalFailure(error: unknown, message: string): void {
  log.error(
    { error: error instanceof Error ? error.message : String(error) },
    message,
  );
}
