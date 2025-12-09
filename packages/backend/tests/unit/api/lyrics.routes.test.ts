
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Elysia } from 'elysia';
import { createLyricsRoutes } from '../../../src/api/lyrics.routes';

// Mock dependencies
const mockLyricsRepo = {
    findByTrackId: vi.fn(),
    save: vi.fn(),
    markNotFound: vi.fn(),
    getPendingTrackIds: vi.fn(),
    getStats: vi.fn(),
};

const mockTrackRepo = {
    findById: vi.fn(),
};

const mockLrcLibAdapter = {
    fetchLyrics: vi.fn(),
};

// Create app with mocked deps
const app = new Elysia()
    .decorate('lyricsRepository', mockLyricsRepo)
    .decorate('trackRepository', mockTrackRepo)
    .decorate('lrcLibAdapter', mockLrcLibAdapter)
    .use(createLyricsRoutes());

describe('Lyrics Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/lyrics/:trackId', () => {
        it('should return cached lyrics if found (cache hit)', async () => {
            // Setup: Lyrics exist in DB
            mockLyricsRepo.findByTrackId.mockResolvedValue({
                trackId: '1',
                plainLyrics: 'La la la',
                status: 'found',
            });

            const response = await app.handle(new Request('http://localhost/api/lyrics/1'));
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.status).toBe('found');
            expect(body.plainLyrics).toBe('La la la');

            // Verify NO call to external API
            expect(mockLrcLibAdapter.fetchLyrics).not.toHaveBeenCalled();
        });

        it('should return cached "not_found" status (cache hit)', async () => {
            // Setup: Lyrics marked as not_found in DB
            mockLyricsRepo.findByTrackId.mockResolvedValue({
                trackId: '2',
                status: 'not_found',
            });

            const response = await app.handle(new Request('http://localhost/api/lyrics/2'));
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.status).toBe('not_found');

            // Verify NO call to external API
            expect(mockLrcLibAdapter.fetchLyrics).not.toHaveBeenCalled();
        });

        it('should fetch from API if status is "pending"', async () => {
            // Setup: Lyrics pending or not in DB (mock returns null or pending)
            mockLyricsRepo.findByTrackId.mockResolvedValue({ status: 'pending' });
            mockTrackRepo.findById.mockResolvedValue({
                title: 'Song',
                artists: [{ name: 'Artist' }],
                album: { name: 'Album' },
                durationMs: 30000
            });
            mockLrcLibAdapter.fetchLyrics.mockResolvedValue({ plainLyrics: 'New Lyrics' });

            const response = await app.handle(new Request('http://localhost/api/lyrics/3'));
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.plainLyrics).toBe('New Lyrics');
            expect(mockLrcLibAdapter.fetchLyrics).toHaveBeenCalled();
            expect(mockLyricsRepo.save).toHaveBeenCalled();
        });

        it('should force fetch from API if force=true even if cached', async () => {
            // Setup: Lyrics exist in DB
            mockLyricsRepo.findByTrackId.mockResolvedValue({
                trackId: '4',
                status: 'not_found', // Previously not found
            });
            mockTrackRepo.findById.mockResolvedValue({
                title: 'Song',
                artists: [{ name: 'Artist' }],
                album: { name: 'Album' },
                durationMs: 30000
            });
            // But now we find them
            mockLrcLibAdapter.fetchLyrics.mockResolvedValue({ plainLyrics: 'Found Now' });

            const response = await app.handle(new Request('http://localhost/api/lyrics/4?force=true'));
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.plainLyrics).toBe('Found Now');

            // Verify YES call to external API because of force param
            expect(mockLrcLibAdapter.fetchLyrics).toHaveBeenCalled();
            expect(mockLyricsRepo.save).toHaveBeenCalled();
        });
    });
});
