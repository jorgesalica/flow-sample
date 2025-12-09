import { Elysia, t } from 'elysia';
import { LrcLibAdapter } from '@infra/adapters/lrclib';
import { SQLiteLyricsRepository, SQLiteTrackRepository } from '@infra/repositories';
import { logger } from '@infra/logger';

const log = logger.child({ module: 'LyricsRoutes' });

export function createLyricsRoutes() {
    const lyricsRepository = new SQLiteLyricsRepository();
    const trackRepository = new SQLiteTrackRepository();
    const lrcLibAdapter = new LrcLibAdapter();

    return new Elysia({ prefix: '/api/lyrics' })
        .decorate('lyricsRepository', lyricsRepository)
        .decorate('trackRepository', trackRepository)
        .decorate('lrcLibAdapter', lrcLibAdapter)

        /**
         * Get lyrics for a specific track
         * Strategy: Cache-first
         * 1. Check DB. If found/not_found, return immediately (unless force=true).
         * 2. If force=true OR status=pending, fetch from LrcLib.
         */
        .get(
            '/:trackId',
            async ({ params, query, lyricsRepository, trackRepository, lrcLibAdapter, set }) => {
                const { trackId } = params;
                const force = query.force === 'true';

                // 1. Check if we already have lyrics
                const existing = await lyricsRepository.findByTrackId(trackId);

                // If cached and not forced, return immediately
                if (existing && existing.status !== 'pending' && !force) {
                    log.debug({ trackId, status: existing.status }, 'Returning cached lyrics');
                    return existing;
                }

                // 2. Get track info for LrcLib query
                const track = await trackRepository.findById(trackId);
                if (!track) {
                    set.status = 404;
                    return { error: 'Track not found' };
                }

                // 3. Fetch from LrcLib
                log.info(
                    { trackId, title: track.title, force },
                    'Fetching lyrics from LrcLib',
                );

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

        /**
         * Batch fetch lyrics for all tracks that don't have them
         * Strictly uses getPendingTrackIds() which checks for NULL or 'pending' status
         */
        .post('/fetch-all', async ({ lyricsRepository, trackRepository, lrcLibAdapter }) => {
            // This method already filters for NULL (missing) or 'pending' records
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

        /**
         * Get lyrics statistics
         */
        .get('/stats', async ({ lyricsRepository }) => {
            return lyricsRepository.getStats();
        });
}
