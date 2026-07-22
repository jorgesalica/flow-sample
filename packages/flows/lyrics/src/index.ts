// @flows/lyrics — Lyrics Flow Package

// Backend exports
export { createLyricsRoutes } from './backend/routes';
export { createLyricsRouteDependencies, type LyricsRoutesDependencies } from './backend/routes';
export { LyricsService, type LyricsApplication } from './backend/lyrics.service';
export {
  LyricsInterpretationService,
  type LyricsInterpretationApplication,
  type LyricsInterpretationProvider,
  type LyricsInterpretationProviderFactory,
} from './backend/interpretation.service';
export { SQLiteLyricsRepository } from './backend/repository';
export { LrcLibAdapter } from './backend/adapter';

// Domain exports
export type {
  LyricsRepository,
  LyricsSource,
  LyricsData,
  LyricsRecord,
  LyricsResult,
  LyricsTrackParams,
  BatchLyricsResult,
} from './domain/ports';
export { FlowError, LyricsNotFoundError, LyricsFetchError } from './domain/errors';
export { expandMeaningAnnotations, type RawAnnotation } from './domain/annotations';
