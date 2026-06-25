import { Elysia, t } from 'elysia';
import { SpotifyUseCase } from './usecase';
import { calculateStats } from './stats.service';
import { SpotifyApiAdapter } from './adapter';
import { SQLiteTrackRepository } from './repository';
import { SQLiteTokenRepository } from './token.repository';
import { SimpleCache, logger } from '@flows/core';

const log = logger.child({ module: 'SpotifyRoutes' });
const apiCache = new SimpleCache();

async function withCache<T>(key: string, fetch: () => Promise<T>): Promise<T> {
  const cached = apiCache.get<T>(key);
  if (cached) {
    log.debug({ key }, 'Cache hit');
    return cached;
  }
  const value = await fetch();
  apiCache.set(key, value);
  return value;
}

export interface SpotifyRoutesConfig {
  spotify: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    successUrl: string;
    refreshToken?: string;
    pageLimit: number;
  };
}

export function createSpotifyRoutes(config: SpotifyRoutesConfig) {
  const repository = new SQLiteTrackRepository();
  const tokenRepository = new SQLiteTokenRepository();

  const adapter = new SpotifyApiAdapter(
    {
      clientId: config.spotify.clientId,
      clientSecret: config.spotify.clientSecret,
      redirectUri: config.spotify.redirectUri,
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

      .get('/auth/login', ({ set, config }) => {
        const scope = 'user-library-read user-read-email';
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: config.spotify.clientId,
          scope,
          redirect_uri: config.spotify.redirectUri,
        });

        set.status = 302;
        set.headers['Location'] = `https://accounts.spotify.com/authorize?${params.toString()}`;
      })

      .get(
        '/auth/callback',
        async ({ query, adapter, set }) => {
          const code = query.code;
          if (!code) {
            set.status = 400;
            return { error: 'No code provided' };
          }

          try {
            await adapter.exchangeCode(code);
            set.status = 302;
            set.headers['Location'] = config.spotify.successUrl;
          } catch (error) {
            log.error({ error }, 'Failed to exchange Spotify auth code');
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

      .post(
        '/run',
        async ({ spotifyUseCase, body, config }) => {
          const limit = body?.limit ?? config.spotify.pageLimit;
          const result = await spotifyUseCase.fetchAndSave({ limit });

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

      .get('/tracks', async ({ spotifyUseCase }) => {
        return spotifyUseCase.getTracks();
      })

      .get(
        '/tracks/search',
        async ({ spotifyRepository, query }) => {
          return spotifyRepository.findPaginated({
            page: query.page,
            limit: query.limit,
            query: query.q,
            genre: query.genre,
            year: query.year,
            sortBy: query.sortBy as 'added_at' | 'title' | undefined,
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
            sortBy: t.Optional(t.String()),
            sortOrder: t.Optional(t.String()),
          }),
        },
      )

      .get('/tracks/:id', async ({ spotifyRepository, params }) => {
        const track = await spotifyRepository.findById(params.id);
        if (!track) {
          return { error: 'Track not found' };
        }
        return track;
      })

      .get('/count', async ({ spotifyUseCase }) => {
        const count = await spotifyUseCase.getTrackCount();
        return { count };
      })

      .get('/genres', ({ spotifyRepository }) =>
        withCache('genres', () => spotifyRepository.getGenres()),
      )

      .get('/years', ({ spotifyRepository }) =>
        withCache('years', () => spotifyRepository.getYears()),
      )

      .get('/stats', ({ spotifyRepository }) =>
        withCache('stats', () => calculateStats(spotifyRepository)),
      )
  );
}
