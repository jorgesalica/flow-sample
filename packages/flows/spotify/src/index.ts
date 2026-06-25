// @flows/spotify — Spotify Flow Package

// Backend exports
export { createSpotifyRoutes } from './backend/routes';
export { SpotifyUseCase, type SpotifyUseCaseOptions } from './backend/usecase';
export { SQLiteTrackRepository, type TrackRepository, type PaginatedResult } from './backend/repository';
export { SQLiteTokenRepository } from './backend/token.repository';
export { calculateStats } from './backend/stats.service';
export { musicDb, rebuildFtsIndex } from './backend/database';
export { SpotifyApiAdapter, type SpotifyConfig } from './backend/adapter';

// Domain exports
export type { SourcePort, StoragePort } from './domain/ports';
export { FlowError, SpotifyAuthError, SpotifyRateLimitError, StorageError } from './domain/errors';
