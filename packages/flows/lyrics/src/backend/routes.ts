import { Elysia, t } from 'elysia';
import { LrcLibAdapter } from './adapter';
import { SQLiteLyricsRepository } from './repository';
import { SQLiteTrackRepository } from '@flows/spotify';
import { logger, LLMClient } from '@flows/core';
import type { LyricsStatus, TrackRepository } from '@flows/shared';

const log = logger.child({ module: 'LyricsRoutes' });

const LYRICS_INTERPRETATION_PROMPT =
  'You are a music analyst. Analyze the following song lyrics. ' +
  'Explain what the song is about, its themes, emotions, and any notable metaphors or references. ' +
  'Write in the same language as the lyrics. Be concise but insightful. ' +
  'Use Markdown formatting for structure.';

export function createLyricsRoutes() {
  const lyricsRepository = new SQLiteLyricsRepository();
  const trackRepository: TrackRepository = new SQLiteTrackRepository();
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

        // Resolve all track data upfront
        const batchParams = [];
        for (const trackId of pendingIds) {
          const track = await trackRepository.findById(trackId);
          if (!track) continue;

          batchParams.push({
            trackId,
            trackName: track.title,
            artistName: track.artists[0]?.name || '',
            albumName: track.album.name,
            durationSeconds: Math.round(track.durationMs / 1000),
          });
        }

        // Fetch concurrently (10 parallel by default)
        const results = await lrcLibAdapter.fetchLyricsBatch(batchParams);

        let found = 0;
        let notFound = 0;
        let errors = 0;

        for (const { trackId, result, error } of results) {
          if (error) {
            errors++;
            continue;
          }

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
        }

        log.info({ found, notFound, errors, total: pendingIds.length }, 'Batch lyrics fetch complete');

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

      // ── AI Interpretation (SSE) ────────────────────────────────────
      .post(
        '/:trackId/interpret',
        async ({ params, lyricsRepository, trackRepository }) => {
          const { trackId } = params;

          // Check if we already have a cached interpretation
          const cached = await lyricsRepository.getInterpretation(trackId);
          if (cached) {
            log.debug({ trackId }, 'Returning cached interpretation');
            const encoder = new TextEncoder();
            return new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'cached', interpretation: cached })}\n\n`));
                  controller.close();
                },
              }),
              { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } },
            );
          }

          // Need lyrics + track info
          const lyrics = await lyricsRepository.findByTrackId(trackId);
          if (!lyrics || lyrics.status !== 'found' || !lyrics.plainLyrics) {
            return new Response(JSON.stringify({ error: 'Lyrics not found for this track' }), { status: 404 });
          }

          const track = await trackRepository.findById(trackId);
          const artist = track?.artists?.[0]?.name || 'Unknown Artist';
          const title = track?.title || 'Unknown Song';

          log.info({ trackId, artist, title }, 'Generating AI interpretation');

          const client = LLMClient.createRotation();
          const stream = client.generateStream({
            messages: [
              {
                role: 'system',
                content: LYRICS_INTERPRETATION_PROMPT,
              },
              {
                role: 'user',
                content: `Song: "${title}" by ${artist}\n\nLyrics:\n${lyrics.plainLyrics}`,
              },
            ],
          });

          const readable = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              let fullText = '';
              try {
                for await (const event of stream) {
                  if (event.done && event.response) {
                    // Save to DB
                    await lyricsRepository.saveInterpretation(trackId, fullText);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                  } else if (event.delta) {
                    fullText += event.delta;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', delta: event.delta })}\n\n`));
                  }
                }
              } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                log.error({ trackId, error: errMsg }, 'Interpretation stream error');
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`));
              } finally {
                controller.close();
              }
            },
          });

          return new Response(readable, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
          });
        },
        {
          params: t.Object({
            trackId: t.String(),
          }),
        },
      )
  );
}
