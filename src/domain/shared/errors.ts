/**
 * Base error for all flow errors
 */
export class FlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlowError';
  }
}

/**
 * Spotify authentication failed
 */
export class SpotifyAuthError extends FlowError {
  constructor(message: string = 'Spotify authentication failed') {
    super(message);
    this.name = 'SpotifyAuthError';
  }
}

/**
 * Spotify rate limit exceeded
 */
export class SpotifyRateLimitError extends FlowError {
  constructor(public retryAfterSeconds: number) {
    super(`Rate limited. Retry after ${retryAfterSeconds} seconds.`);
    this.name = 'SpotifyRateLimitError';
  }
}

/**
 * Storage operation failed
 */
export class StorageError extends FlowError {
  constructor(
    message: string,
    public path?: string,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
