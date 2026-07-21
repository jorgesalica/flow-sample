import { LYRICS_STATUSES } from '@flows/shared';
import { t } from 'elysia';

export const lyricsStatusSchema = t.Union([
  t.Literal(LYRICS_STATUSES.PENDING),
  t.Literal(LYRICS_STATUSES.FOUND),
  t.Literal(LYRICS_STATUSES.NOT_FOUND),
]);

export const lyricsSchema = t.Object({
  trackId: t.String(),
  plainLyrics: t.Nullable(t.String()),
  syncedLyrics: t.Nullable(t.String()),
  status: lyricsStatusSchema,
  fetchedAt: t.Nullable(t.String()),
  interpretation: t.Optional(t.Nullable(t.String())),
});

export const lyricsLibraryTrackSchema = t.Object({
  id: t.String(),
  title: t.String(),
  artist: t.String(),
  imageUrl: t.Nullable(t.String()),
  status: lyricsStatusSchema,
});

export const lyricsStatsSchema = t.Object({
  total: t.Number(),
  found: t.Number(),
  notFound: t.Number(),
  pending: t.Number(),
});

export const lyricsBatchResponseSchema = t.Object({
  processed: t.Number(),
  found: t.Number(),
  notFound: t.Number(),
  errors: t.Number(),
});

export const lyricsErrorResponseSchema = t.Object({ error: t.String() });
