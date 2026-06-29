import { describe, it, expect } from 'vitest';
import { FlowError, LyricsNotFoundError, LyricsFetchError } from '../../src/domain/errors';

describe('lyrics domain errors', () => {
    it('FlowError carries its message and name', () => {
        const e = new FlowError('boom');
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe('boom');
        expect(e.name).toBe('FlowError');
    });

    it('LyricsNotFoundError derives a default message from the trackId', () => {
        const e = new LyricsNotFoundError('t1');
        expect(e).toBeInstanceOf(FlowError);
        expect(e.trackId).toBe('t1');
        expect(e.message).toBe('Lyrics not found for track t1');
        expect(e.name).toBe('LyricsNotFoundError');
    });

    it('LyricsNotFoundError accepts a custom message', () => {
        expect(new LyricsNotFoundError('t2', 'custom').message).toBe('custom');
    });

    it('LyricsFetchError defaults its message and leaves trackId optional', () => {
        const e = new LyricsFetchError();
        expect(e).toBeInstanceOf(FlowError);
        expect(e.message).toBe('Failed to fetch lyrics');
        expect(e.trackId).toBeUndefined();
        expect(e.name).toBe('LyricsFetchError');
    });

    it('LyricsFetchError accepts a message and trackId', () => {
        const e = new LyricsFetchError('network down', 't3');
        expect(e.message).toBe('network down');
        expect(e.trackId).toBe('t3');
    });
});
