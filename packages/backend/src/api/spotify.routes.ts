import { Elysia, t } from 'elysia';
import { SpotifyUseCase } from '@app/index';
import { calculateStats } from '@app/stats.service';
import type { GenreCount, YearCount } from '@domain/flows/spotify';
import { SpotifyApiAdapter } from '@infra/adapters/spotify-api';
import { SQLiteTrackRepository } from '@infra/repositories';
import { apiCache } from '@infra/cache';
import { logger } from '@infra/logger';
import type { Config } from './config';

const log = logger.child({ module: 'SpotifyRoutes' });

import { SQLiteTokenRepository } from '@infra/repositories/sqlite-token.repository';

export function createSpotifyRoutes(config: Config) {
  const repository = new SQLiteTrackRepository();
  const tokenRepository = new SQLiteTokenRepository();

  const adapter = new SpotifyApiAdapter(
    {
      clientId: config.spotify.clientId,
      clientSecret: config.spotify.clientSecret,
      refreshToken: config.spotify.refreshToken,
    },
    tokenRepository,
  );

  const useCase = new SpotifyUseCase(adapter, repository);

  return (
    new Elysia({ prefix: '/api/spotify' })
      .decorate('spotifyUseCase', useCase)
      .decorate('spotifyRepository', repository)
      .decorate('tokenRepository', tokenRepository)
      .decorate('adapter', adapter)
      .decorate('config', config)

      // --- Auth Routes ---

      .get('/auth/login', ({ redirect, config }) => {
        const scope = 'user-library-read user-read-email';
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: config.spotify.clientId,
          scope,
          redirect_uri: 'http://127.0.0.1:4173/api/spotify/auth/callback',
        });

        return redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
      })

      .get(
        '/auth/callback',
        async ({ query, adapter, set, redirect }) => {
          const code = query.code;
          if (!code) {
            set.status = 400;
            return { error: 'No code provided' };
          }

          try {
            await adapter.exchangeCode(code);
            return redirect('http://localhost:5173/?connected=true#/spotify'); // Back to UI Spotify Flow
          } catch {
            set.status = 500;
            return { error: 'Failed to exchange token' };
          }
        },
        {
          query: t.Object({
            code: t.String(),
            state: t.Optional(t.String()),
          }),
        },
      )

      .get('/auth/status', ({ tokenRepository }) => {
        const hasToken = !!tokenRepository.get('spotify:refresh_token');
        return { connected: hasToken };
      })

      // --- Flow Routes ---

      // Run flow (fetch + enrich + save)
      .post(
        '/run',
        async ({ spotifyUseCase, body, config }) => {
          const limit = body?.limit ?? config.spotify.pageLimit;
          const result = await spotifyUseCase.fetchAndSave({ limit });

          // Invalidate cache after sync
          apiCache.invalidateAll();
          log.info('Cache invalidated after sync');

          return {
            success: true,
            message: 'Flow completed.',
            count: result.count,
          };
        },
        {
          body: t.Optional(
            t.Object({
              limit: t.Optional(t.Number()),
            }),
          ),
        },
      )

      // Get all tracks (simple, no pagination)
      .get('/tracks', async ({ spotifyUseCase }) => {
        return spotifyUseCase.getTracks();
      })

      // Get tracks with pagination, search, filters
      .get(
        '/tracks/search',
        async ({ spotifyRepository, query }) => {
          return spotifyRepository.findPaginated({
            page: query.page,
            limit: query.limit,
            query: query.q,
            genre: query.genre,
            year: query.year,
            minPopularity: query.minPopularity,
            sortBy: query.sortBy as 'added_at' | 'popularity' | 'title' | undefined,
            sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
          });
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ default: 1 })),
            limit: t.Optional(t.Numeric({ default: 50 })),
            q: t.Optional(t.String()),
            genre: t.Optional(t.String()),
            year: t.Optional(t.Numeric()),
            minPopularity: t.Optional(t.Numeric()),
            sortBy: t.Optional(t.String()),
            sortOrder: t.Optional(t.String()),
          }),
        },
      )

      // Get single track
      .get('/tracks/:id', async ({ spotifyRepository, params }) => {
        const track = await spotifyRepository.findById(params.id);
        if (!track) {
          return { error: 'Track not found' };
        }
        return track;
      })

      // Get track count
      .get('/count', async ({ spotifyUseCase }) => {
        const count = await spotifyUseCase.getTrackCount();
        return { count };
      })

      // Get all unique genres with counts (cached 5 min)
      .get('/genres', async ({ spotifyRepository }) => {
        const cached = apiCache.get<GenreCount[]>('genres');
        if (cached) {
          log.debug('Cache hit: genres');
          return cached;
        }
        const genres = await spotifyRepository.getGenres();
        apiCache.set('genres', genres);
        return genres;
      })

      // Get all years with counts (cached 5 min)
      .get('/years', async ({ spotifyRepository }) => {
        const cached = apiCache.get<YearCount[]>('years');
        if (cached) {
          log.debug('Cache hit: years');
          return cached;
        }
        const years = await spotifyRepository.getYears();
        apiCache.set('years', years);
        return years;
      })

      // Get stats summary (cached 5 min)
      .get('/stats', async ({ spotifyRepository }) => {
        const cached = apiCache.get<object>('stats');
        if (cached) {
          log.debug('Cache hit: stats');
          return cached;
        }

        const stats = await calculateStats(spotifyRepository);

        apiCache.set('stats', stats);
        return stats;
      })
  );
}
