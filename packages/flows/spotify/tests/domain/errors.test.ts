import { describe, it, expect } from 'vitest';
import {
    FlowError,
    SpotifyAuthError,
    SpotifyRateLimitError,
    StorageError,
} from '../../src/domain/errors';

describe('spotify domain errors', () => {
    it('FlowError carries its message and name', () => {
        const e = new FlowError('boom');
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe('boom');
        expect(e.name).toBe('FlowError');
    });

    it('SpotifyAuthError defaults its message and extends FlowError', () => {
        const e = new SpotifyAuthError();
        expect(e).toBeInstanceOf(FlowError);
        expect(e.message).toBe('Spotify authentication failed');
        expect(e.name).toBe('SpotifyAuthError');
    });

    it('SpotifyAuthError accepts a custom message', () => {
        expect(new SpotifyAuthError('token expired').message).toBe('token expired');
    });

    it('SpotifyRateLimitError builds its message from retryAfterSeconds', () => {
        const e = new SpotifyRateLimitError(30);
        expect(e).toBeInstanceOf(FlowError);
        expect(e.retryAfterSeconds).toBe(30);
        expect(e.message).toBe('Rate limited. Retry after 30 seconds.');
        expect(e.name).toBe('SpotifyRateLimitError');
    });

    it('StorageError carries an optional path', () => {
        const withPath = new StorageError('disk full', '/data/music.db');
        expect(withPath).toBeInstanceOf(FlowError);
        expect(withPath.message).toBe('disk full');
        expect(withPath.path).toBe('/data/music.db');
        expect(withPath.name).toBe('StorageError');
        expect(new StorageError('no path').path).toBeUndefined();
    });
});
