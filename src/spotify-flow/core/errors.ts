export class FlowError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FlowError';
    }
}

export class SpotifyAuthError extends FlowError {
    constructor(message: string = 'Spotify authentication failed') {
        super(message);
        this.name = 'SpotifyAuthError';
    }
}

export class SpotifyRateLimitError extends FlowError {
    constructor(public retryAfterSeconds: number) {
        super(`Rate limited. Retry after ${retryAfterSeconds} seconds.`);
        this.name = 'SpotifyRateLimitError';
    }
}

export class StorageError extends FlowError {
    constructor(message: string, public path?: string) {
        super(message);
        this.name = 'StorageError';
    }
}
