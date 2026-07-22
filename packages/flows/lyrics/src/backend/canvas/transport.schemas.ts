import { LYRICS_CANVAS_ERROR_CODES } from '@flows/shared';
import { t } from 'elysia';

const canvasSourceTypeSchema = t.Union([t.Literal('track'), t.Literal('user_text')]);

const tokenSchema = t.Object({
  id: t.String(),
  text: t.String(),
});

const sectionSchema = t.Object({
  id: t.String(),
  type: t.String(),
  lines: t.Array(t.Array(tokenSchema)),
});

const tokenAstSchema = t.Object({
  sections: t.Array(sectionSchema),
  totalTokens: t.Number(),
});

const annotationSchema = t.Object(
  {
    tokenId: t.String(),
    layerId: t.String(),
    label: t.String(),
    detail: t.String(),
  },
  { additionalProperties: true },
);

const annotationLayerSchema = t.Object({
  id: t.String(),
  name: t.String(),
  icon: t.String(),
  color: t.String(),
});

export const lyricsCanvasAnalysisSchema = t.Object({
  id: t.String(),
  sourceId: t.String(),
  sourceType: canvasSourceTypeSchema,
  sourceTextHash: t.String(),
  tokenAst: tokenAstSchema,
  annotations: t.Array(annotationSchema),
  layers: t.Array(annotationLayerSchema),
  meta: t.Optional(t.Record(t.String(), t.Unknown())),
  modelUsed: t.String(),
  providerUsed: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const lyricsCanvasSourceSchema = t.Object({
  sourceId: t.String(),
  sourceType: t.Literal('track'),
  title: t.String(),
  author: t.String(),
  imageUrl: t.Nullable(t.String()),
});

export const lyricsCanvasNeedsAnalysisSchema = t.Object({
  needsAnalysis: t.Literal(true),
  source: lyricsCanvasSourceSchema,
});

export const lyricsCanvasLoadResponseSchema = t.Union([
  lyricsCanvasAnalysisSchema,
  lyricsCanvasNeedsAnalysisSchema,
]);

export const lyricsCanvasErrorCodeSchema = t.Union([
  t.Literal(LYRICS_CANVAS_ERROR_CODES.TRACK_NOT_FOUND),
  t.Literal(LYRICS_CANVAS_ERROR_CODES.LYRICS_MISSING),
  t.Literal(LYRICS_CANVAS_ERROR_CODES.SOURCE_UNAVAILABLE),
  t.Literal(LYRICS_CANVAS_ERROR_CODES.ANALYSIS_UNAVAILABLE),
]);

export const lyricsCanvasErrorResponseSchema = t.Object({
  code: lyricsCanvasErrorCodeSchema,
  error: t.String(),
});
