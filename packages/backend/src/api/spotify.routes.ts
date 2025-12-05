import { Elysia, t } from 'elysia';
import { SpotifyUseCase } from '../application';
import { SpotifyApiAdapter } from '../infrastructure/adapters/spotify-api';
import { SQLiteTrackRepository } from '../infrastructure/repositories';
import type { Config } from './config';

export function createSpotifyRoutes(config: Config) {
  const repository = new SQLiteTrackRepository();
  const adapter = new SpotifyApiAdapter({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.clientSecret,
    refreshToken: config.spotify.refreshToken,
  });
  const useCase = new SpotifyUseCase(adapter, repository);

  return (
    new Elysia({ prefix: '/api/spotify' })
      .decorate('spotifyUseCase', useCase)
      .decorate('spotifyRepository', repository)
      .decorate('config', config)

      // Run flow (fetch + enrich + save)
      .post(
        '/run',
        async ({ spotifyUseCase, body, config }) => {
          const limit = body?.limit ?? config.spotify.pageLimit;
          const result = await spotifyUseCase.fetchAndSave({ limit });
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

      // Get all unique genres with counts
      .get('/genres', async ({ spotifyRepository }) => {
        return spotifyRepository.getGenres();
      })

      // Get all years with counts
      .get('/years', async ({ spotifyRepository }) => {
        return spotifyRepository.getYears();
      })

      // Get stats summary
      .get('/stats', async ({ spotifyRepository }) => {
        const [count, genres, years] = await Promise.all([
          spotifyRepository.count(),
          spotifyRepository.getGenres(),
          spotifyRepository.getYears(),
        ]);

        const topGenres = genres.slice(0, 10);
        const decadeDistribution: Record<string, number> = {};

        for (const { year, count } of years) {
          const decade = Math.floor(year / 10) * 10;
          const decadeKey = `${decade}s`;
          decadeDistribution[decadeKey] = (decadeDistribution[decadeKey] || 0) + count;
        }

        return {
          totalTracks: count,
          totalGenres: genres.length,
          topGenres,
          decadeDistribution,
          yearRange:
            years.length > 0
              ? {
                oldest: years[years.length - 1]?.year,
                newest: years[0]?.year,
              }
              : null,
        };
      })
  );
}
