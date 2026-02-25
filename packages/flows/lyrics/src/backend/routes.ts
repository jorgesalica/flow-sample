import { Elysia, t } from 'elysia';
import { LrcLibAdapter } from './adapter';
import { SQLiteLyricsRepository } from './repository';
import { SQLiteTrackRepository } from '@flows/spotify/src/backend/repository';
import { logger } from '@flows/core';
import type { LyricsStatus } from '@flows/shared';

const log = logger.child({ module: 'LyricsRoutes' });

export function createLyricsRoutes() {
  const lyricsRepository = new SQLiteLyricsRepository();
  const trackRepository = new SQLiteTrackRepository();
  const lrcLibAdapter = new LrcLibAdapter();

  return (
    new Elysia({ prefix: '/api/lyrics' })
      .decorate('lyricsRepository', lyricsRepository)
      .decorate('trackRepository', trackRepository)
      .decorate('lrcLibAdapter', lrcLibAdapter)

      .get(
        '/:trackId',
        async ({ params, query, lyricsRepository, trackRepository, lrcLibAdapter, set }) => {
          const { trackId } = params;
          const force = query.force === 'true';

          const existing = await lyricsRepository.findByTrackId(trackId);

          if (existing && existing.status !== 'pending' && !force) {
            log.debug({ trackId, status: existing.status }, 'Returning cached lyrics');
            return existing;
          }

          const track = await trackRepository.findById(trackId);
          if (!track) {
            set.status = 404;
            return { error: 'Track not found' };
          }

          log.info({ trackId, title: track.title, force }, 'Fetching lyrics from LrcLib');

          try {
            const result = await lrcLibAdapter.fetchLyrics({
              trackName: track.title,
              artistName: track.artists[0]?.name || '',
              albumName: track.album.name,
              durationSeconds: Math.round(track.durationMs / 1000),
            });

            if (result && (result.plainLyrics || result.syncedLyrics)) {
              await lyricsRepository.save(trackId, {
                plainLyrics: result.plainLyrics,
                syncedLyrics: result.syncedLyrics,
              });

              return {
                trackId,
                plainLyrics: result.plainLyrics,
                syncedLyrics: result.syncedLyrics,
                status: 'found' as const,
                fetchedAt: new Date().toISOString(),
              };
            } else {
              await lyricsRepository.markNotFound(trackId);
              return {
                trackId,
                plainLyrics: null,
                syncedLyrics: null,
                status: 'not_found' as const,
                fetchedAt: new Date().toISOString(),
              };
            }
          } catch (error) {
            log.error({ trackId, error }, 'Failed to fetch lyrics');
            set.status = 500;
            return { error: 'Failed to fetch lyrics' };
          }
        },
        {
          params: t.Object({
            trackId: t.String(),
          }),
          query: t.Object({
            force: t.Optional(t.String()),
          }),
        },
      )

      .post('/fetch-all', async ({ lyricsRepository, trackRepository, lrcLibAdapter }) => {
        const pendingIds = await lyricsRepository.getPendingTrackIds();
        log.info({ count: pendingIds.length }, 'Starting batch lyrics fetch');

        let found = 0;
        let notFound = 0;
        let errors = 0;

        for (const trackId of pendingIds) {
          const track = await trackRepository.findById(trackId);
          if (!track) {
            errors++;
            continue;
          }

          try {
            const result = await lrcLibAdapter.fetchLyrics({
              trackName: track.title,
              artistName: track.artists[0]?.name || '',
              albumName: track.album.name,
              durationSeconds: Math.round(track.durationMs / 1000),
            });

            if (result && (result.plainLyrics || result.syncedLyrics)) {
              await lyricsRepository.save(trackId, {
                plainLyrics: result.plainLyrics,
                syncedLyrics: result.syncedLyrics,
              });
              found++;
            } else {
              await lyricsRepository.markNotFound(trackId);
              notFound++;
            }
          } catch (error) {
            log.warn({ trackId, error }, 'Failed to fetch lyrics for track');
            errors++;
          }
        }

        log.info({ found, notFound, errors }, 'Batch lyrics fetch complete');

        return {
          processed: pendingIds.length,
          found,
          notFound,
          errors,
        };
      })

      .get(
        '/tracks',
        async ({ lyricsRepository, query }) => {
          const limit = query.limit ? parseInt(query.limit) : 50;
          const offset = query.offset ? parseInt(query.offset) : 0;
          const status =
            query.status && ['found', 'not_found', 'pending'].includes(query.status)
              ? (query.status as LyricsStatus)
              : undefined;

          return lyricsRepository.getLibraryWithStatus(limit, offset, status);
        },
        {
          query: t.Object({
            limit: t.Optional(t.String()),
            offset: t.Optional(t.String()),
            status: t.Optional(t.String()),
          }),
        },
      )

      .get('/stats', async ({ lyricsRepository }) => {
        return lyricsRepository.getStats();
      })
  );
}
