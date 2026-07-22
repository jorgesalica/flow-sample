// @flows/spotify — Spotify Flow Package

// Backend exports
export { createSpotifyRoutes } from './backend/routes';
export type { SpotifyRoutesConfig, SpotifyRuntimeConfig } from './backend/config';
export {
  SpotifyService,
  createSpotifyService,
  type SpotifyApplication,
  type SpotifyServiceDependencies,
} from './backend/spotify.service';
export { SpotifyUseCase, type SpotifyUseCaseOptions } from './backend/usecase';
export { SQLiteTokenRepository } from './backend/token.repository';
export { calculateStats } from './backend/stats.service';
export { SpotifyApiAdapter, type SpotifyConfig } from './backend/adapter';

// Domain exports
export type {
  SourcePort,
  StoragePort,
  ArtistDetails,
  SpotifySourcePort,
  SpotifyGateway,
  SpotifyTokenRepository,
  SpotifyTrackSearch,
  SpotifyTrackRepository,
  SpotifyCache,
} from './domain/ports';
export { FlowError, SpotifyAuthError, SpotifyRateLimitError, StorageError } from './domain/errors';
