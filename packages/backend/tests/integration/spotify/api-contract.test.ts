import { describe, it, expect } from 'vitest';

/**
 * API Contract Tests - Verify endpoint response structures
 * TODO: Expand when API stabilizes
 */
describe('API Contract Tests', () => {
    describe('GET /api/spotify/tracks', () => {
        it.todo('returns array of tracks with required fields');
        it.todo('returns empty array when no tracks');
    });

    describe('GET /api/spotify/genres', () => {
        it.todo('returns array of { genre, count }');
    });

    describe('GET /api/spotify/stats', () => {
        it.todo('returns stats object with totalTracks, topGenres, decadeDistribution');
    });
});
