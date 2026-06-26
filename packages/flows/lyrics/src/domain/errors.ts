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
 * Requested lyrics could not be found for a track
 */
export class LyricsNotFoundError extends FlowError {
  constructor(
    public trackId: string,
    message: string = `Lyrics not found for track ${trackId}`,
  ) {
    super(message);
    this.name = 'LyricsNotFoundError';
  }
}

/**
 * Fetching lyrics from the external source failed
 */
export class LyricsFetchError extends FlowError {
  constructor(
    message: string = 'Failed to fetch lyrics',
    public trackId?: string,
  ) {
    super(message);
    this.name = 'LyricsFetchError';
  }
}
