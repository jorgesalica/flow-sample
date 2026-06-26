import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Track, GenreCount, YearCount, TrackRepository } from '@flows/shared';
import type { SpotifySourcePort, ArtistDetails } from '../../src/backend/usecase';

// Mock the database module so importing the use case never touches a real
// music.db file. rebuildFtsIndex is a side-effect we just want to observe.
const rebuildFtsIndex = vi.fn();
vi.mock('../../src/backend/database', () => ({ rebuildFtsIndex }));

const { SpotifyUseCase } = await import('../../src/backend/usecase');

// ── Fixtures ──────────────────────────────────────────────────────────
function makeTrack(overrides: Partial<Track> = {}): Track {
    return {
        id: 't1',
        title: 'Test Song',
        artists: [{ id: 'a1', name: 'The Mock Band' }],
        album: { id: 'alb1', name: 'Mock Album', releaseDate: '2010-01-01', releaseYear: 2010 },
        addedAt: '2024-01-01T00:00:00.000Z',
        durationMs: 180000,
        ...overrides,
    };
}

function makeSource(overrides: Partial<SpotifySourcePort> = {}): SpotifySourcePort {
    return {
        fetchTracks: vi.fn<[number?], Promise<Track[]>>().mockResolvedValue([]),
        fetchArtistDetails: vi
            .fn<[string[]], Promise<Map<string, ArtistDetails>>>()
            .mockResolvedValue(new Map()),
        ...overrides,
    };
}

function makeRepo(overrides: Partial<TrackRepository> = {}): TrackRepository {
    return {
        save: vi.fn<[Track[]], Promise<void>>().mockResolvedValue(undefined),
        findAll: vi.fn<[], Promise<Track[]>>().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue(null),
        count: vi.fn<[], Promise<number>>().mockResolvedValue(0),
        getGenres: vi.fn<[], Promise<GenreCount[]>>().mockResolvedValue([]),
        getYears: vi.fn<[], Promise<YearCount[]>>().mockResolvedValue([]),
        ...overrides,
    };
}

describe('SpotifyUseCase', () => {
    beforeEach(() => {
        rebuildFtsIndex.mockClear();
    });

    describe('fetchAndSave', () => {
        it('fetches with default limit, saves, and rebuilds the FTS index', async () => {
            const source = makeSource({
                fetchTracks: vi.fn().mockResolvedValue([makeTrack()]),
            });
            const repo = makeRepo();
            const useCase = new SpotifyUseCase(source, repo);

            const result = await useCase.fetchAndSave();

            expect(source.fetchTracks).toHaveBeenCalledWith(20);
            expect(repo.save).toHaveBeenCalledTimes(1);
            expect(rebuildFtsIndex).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ count: 1 });
        });

        it('forwards a custom limit to the source', async () => {
            const source = makeSource();
            const useCase = new SpotifyUseCase(source, makeRepo());

            await useCase.fetchAndSave({ limit: 5, enrichGenres: false });

            expect(source.fetchTracks).toHaveBeenCalledWith(5);
        });

        it('skips enrichment when enrichGenres is false', async () => {
            const source = makeSource({
                fetchTracks: vi.fn().mockResolvedValue([makeTrack()]),
            });
            const repo = makeRepo();
            const useCase = new SpotifyUseCase(source, repo);

            await useCase.fetchAndSave({ enrichGenres: false });

            expect(source.fetchArtistDetails).not.toHaveBeenCalled();
            // saved tracks should be the un-enriched originals
            const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as Track[];
            expect(saved[0].artists[0].genres).toBeUndefined();
        });

        it('does not enrich when there are no tracks even if enrichGenres is true', async () => {
            const source = makeSource({ fetchTracks: vi.fn().mockResolvedValue([]) });
            const useCase = new SpotifyUseCase(source, makeRepo());

            const result = await useCase.fetchAndSave({ enrichGenres: true });

            expect(source.fetchArtistDetails).not.toHaveBeenCalled();
            expect(result).toEqual({ count: 0 });
        });

        it('enriches artists with fetched genres and images', async () => {
            const source = makeSource({
                fetchTracks: vi.fn().mockResolvedValue([
                    makeTrack({
                        artists: [
                            { id: 'a1', name: 'Band One' },
                            { id: 'a2', name: 'Band Two' },
                        ],
                    }),
                ]),
                fetchArtistDetails: vi.fn().mockResolvedValue(
                    new Map<string, ArtistDetails>([
                        ['a1', { genres: ['rock', 'indie'], imageUrl: 'https://img.mock.test/a1.jpg' }],
                        ['a2', { genres: ['pop'], imageUrl: 'https://img.mock.test/a2.jpg' }],
                    ]),
                ),
            });
            const repo = makeRepo();
            const useCase = new SpotifyUseCase(source, repo);

            await useCase.fetchAndSave({ enrichGenres: true });

            expect(source.fetchArtistDetails).toHaveBeenCalledWith(['a1', 'a2']);
            const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as Track[];
            expect(saved[0].artists[0].genres).toEqual(['rock', 'indie']);
            expect(saved[0].artists[0].imageUrl).toBe('https://img.mock.test/a1.jpg');
            expect(saved[0].artists[1].genres).toEqual(['pop']);
        });

        it('deduplicates artist ids before requesting details', async () => {
            const source = makeSource({
                fetchTracks: vi.fn().mockResolvedValue([
                    makeTrack({ id: 't1', artists: [{ id: 'a1', name: 'Shared' }] }),
                    makeTrack({ id: 't2', artists: [{ id: 'a1', name: 'Shared' }] }),
                ]),
            });
            const useCase = new SpotifyUseCase(source, makeRepo());

            await useCase.fetchAndSave({ enrichGenres: true });

            expect(source.fetchArtistDetails).toHaveBeenCalledWith(['a1']);
        });

        it('keeps the original artist when no enrichment data is returned', async () => {
            const source = makeSource({
                fetchTracks: vi.fn().mockResolvedValue([
                    makeTrack({ artists: [{ id: 'a1', name: 'Orphan', genres: ['existing'] }] }),
                ]),
                fetchArtistDetails: vi.fn().mockResolvedValue(new Map()),
            });
            const repo = makeRepo();
            const useCase = new SpotifyUseCase(source, repo);

            await useCase.fetchAndSave({ enrichGenres: true });

            const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as Track[];
            expect(saved[0].artists[0]).toEqual({ id: 'a1', name: 'Orphan', genres: ['existing'] });
        });

        it('falls back to the artist genres when enrichment returns empty genres', async () => {
            const source = makeSource({
                fetchTracks: vi.fn().mockResolvedValue([
                    makeTrack({ artists: [{ id: 'a1', name: 'KeepMine', genres: ['original'] }] }),
                ]),
                fetchArtistDetails: vi.fn().mockResolvedValue(
                    new Map<string, ArtistDetails>([['a1', { genres: [], imageUrl: 'https://img.mock.test/a1.jpg' }]]),
                ),
            });
            const repo = makeRepo();
            const useCase = new SpotifyUseCase(source, repo);

            await useCase.fetchAndSave({ enrichGenres: true });

            const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as Track[];
            expect(saved[0].artists[0].genres).toEqual(['original']);
            expect(saved[0].artists[0].imageUrl).toBe('https://img.mock.test/a1.jpg');
        });
    });

    describe('getTracks', () => {
        it('delegates to repository.findAll', async () => {
            const tracks = [makeTrack()];
            const repo = makeRepo({ findAll: vi.fn().mockResolvedValue(tracks) });
            const useCase = new SpotifyUseCase(makeSource(), repo);

            expect(await useCase.getTracks()).toBe(tracks);
            expect(repo.findAll).toHaveBeenCalledTimes(1);
        });
    });

    describe('getTrackCount', () => {
        it('delegates to repository.count', async () => {
            const repo = makeRepo({ count: vi.fn().mockResolvedValue(123) });
            const useCase = new SpotifyUseCase(makeSource(), repo);

            expect(await useCase.getTrackCount()).toBe(123);
            expect(repo.count).toHaveBeenCalledTimes(1);
        });
    });
});
