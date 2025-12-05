import { describe, it, expect } from 'vitest';
import {
    FlowError,
    SpotifyAuthError,
    SpotifyRateLimitError,
    StorageError
} from '../../src/spotify-flow/core/errors';

describe('Error Classes', () => {
    describe('SpotifyAuthError', () => {
        it('has correct name and message', () => {
            const error = new SpotifyAuthError('Token expired');
            expect(error.name).toBe('SpotifyAuthError');
            expect(error.message).toBe('Token expired');
            expect(error).toBeInstanceOf(FlowError);
        });

        it('uses default message', () => {
            const error = new SpotifyAuthError();
            expect(error.message).toBe('Spotify authentication failed');
        });
    });

    describe('SpotifyRateLimitError', () => {
        it('includes retry-after seconds', () => {
            const error = new SpotifyRateLimitError(30);
            expect(error.name).toBe('SpotifyRateLimitError');
            expect(error.retryAfterSeconds).toBe(30);
            expect(error.message).toContain('30 seconds');
        });
    });

    describe('StorageError', () => {
        it('includes path when provided', () => {
            const error = new StorageError('Write failed', '/path/to/file');
            expect(error.name).toBe('StorageError');
            expect(error.path).toBe('/path/to/file');
        });
    });
});
