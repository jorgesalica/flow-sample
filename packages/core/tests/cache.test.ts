import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimpleCache } from '../src/cache';

describe('SimpleCache', () => {
    let cache: SimpleCache;

    beforeEach(() => {
        vi.useFakeTimers();
        cache = new SimpleCache(1000);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns null for a missing key', () => {
        expect(cache.get('missing')).toBeNull();
    });

    it('returns the stored value', () => {
        cache.set('key', 'value');
        expect(cache.get<string>('key')).toBe('value');
    });

    it('returns value before TTL expires', () => {
        cache.set('key', 'value');
        vi.advanceTimersByTime(999);
        expect(cache.get<string>('key')).toBe('value');
    });

    it('returns null after TTL expires', () => {
        cache.set('key', 'value');
        vi.advanceTimersByTime(1001);
        expect(cache.get('key')).toBeNull();
    });

    it('uses per-entry custom TTL override', () => {
        cache.set('short', 'value', 500);
        vi.advanceTimersByTime(501);
        expect(cache.get('short')).toBeNull();
    });

    it('custom TTL does not affect other entries using default TTL', () => {
        cache.set('short', 'a', 500);
        cache.set('long', 'b');
        vi.advanceTimersByTime(501);
        expect(cache.get('short')).toBeNull();
        expect(cache.get<string>('long')).toBe('b');
    });

    it('invalidate removes a specific key', () => {
        cache.set('a', 1);
        cache.set('b', 2);
        cache.invalidate('a');
        expect(cache.get('a')).toBeNull();
        expect(cache.get<number>('b')).toBe(2);
    });

    it('invalidate on missing key is a no-op', () => {
        expect(() => cache.invalidate('ghost')).not.toThrow();
    });

    it('invalidateAll clears all keys', () => {
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);
        cache.invalidateAll();
        expect(cache.get('a')).toBeNull();
        expect(cache.get('b')).toBeNull();
        expect(cache.get('c')).toBeNull();
    });

    it('stores objects and arrays correctly', () => {
        cache.set('obj', { x: 1, y: [2, 3] });
        expect(cache.get<{ x: number; y: number[] }>('obj')).toEqual({ x: 1, y: [2, 3] });
    });

    it('overwrites an existing key with a new value', () => {
        cache.set('key', 'first');
        cache.set('key', 'second');
        expect(cache.get<string>('key')).toBe('second');
    });
});
