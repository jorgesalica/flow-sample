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

  return new Elysia({ prefix: '/api/spotify' })
    .decorate('spotifyUseCase', useCase)
    .decorate('config', config)

    .post(
      '/run',
      async ({ spotifyUseCase, body, config }) => {
        const limit = body?.limit ?? config.spotify.pageLimit;
        const result = await spotifyUseCase.fetchAndSave({ limit });
        return {
          success: true,
          message: 'Flow completed.',
          count: result.count,
          output: 'liked_songs.json',
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
      const tracks = await spotifyUseCase.getTracks();
      return tracks;
    })

    .get('/count', async ({ spotifyUseCase }) => {
      const count = await spotifyUseCase.getTrackCount();
      return { count };
    });
}
