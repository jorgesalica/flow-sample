import { t } from 'elysia';

export const spotifyArtistSchema = t.Object({
  id: t.String(),
  name: t.String(),
  genres: t.Optional(t.Array(t.String())),
  imageUrl: t.Optional(t.String()),
});

export const spotifyAlbumSchema = t.Object({
  id: t.String(),
  name: t.String(),
  releaseDate: t.String(),
  releaseYear: t.Optional(t.Number()),
  imageUrl: t.Optional(t.String()),
});

export const spotifyTrackSchema = t.Object({
  id: t.String(),
  title: t.String(),
  artists: t.Array(spotifyArtistSchema),
  album: spotifyAlbumSchema,
  addedAt: t.String(),
  durationMs: t.Number(),
  previewUrl: t.Optional(t.String()),
  spotifyUrl: t.Optional(t.String()),
});

export const spotifyPaginatedTracksSchema = t.Object({
  data: t.Array(spotifyTrackSchema),
  total: t.Number(),
  page: t.Number(),
  limit: t.Number(),
  totalPages: t.Number(),
});

export const spotifyGenreCountSchema = t.Object({
  genre: t.String(),
  count: t.Number(),
});

export const spotifyYearCountSchema = t.Object({
  year: t.Number(),
  count: t.Number(),
});

export const spotifyStatsSchema = t.Object({
  totalTracks: t.Number(),
  totalGenres: t.Number(),
  topGenres: t.Array(spotifyGenreCountSchema),
  decadeDistribution: t.Record(t.String(), t.Number()),
  yearRange: t.Union([t.Object({ oldest: t.Number(), newest: t.Number() }), t.Null()]),
});

export const spotifyAuthStatusSchema = t.Object({ connected: t.Boolean() });
export const spotifySyncResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  count: t.Number(),
});
export const spotifyErrorResponseSchema = t.Object({
  error: t.String(),
  retryAfterSeconds: t.Optional(t.Number()),
});

export const spotifySearchQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 50 })),
  q: t.Optional(t.String()),
  genre: t.Optional(t.String()),
  year: t.Optional(t.Numeric()),
  sortBy: t.Optional(t.Union([t.Literal('added_at'), t.Literal('title')])),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});
