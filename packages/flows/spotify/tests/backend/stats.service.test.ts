import { describe, it, expect, vi } from 'vitest';
import type { GenreCount, YearCount, Track, TrackRepository } from '@flows/shared';
import { calculateStats } from '../../src/backend/stats.service';

// A repository test double: calculateStats only reads count/genres/years.
// The other TrackRepository methods are present to satisfy the interface but unused.
function makeRepo(opts: {
    count?: number;
    genres?: GenreCount[];
    years?: YearCount[];
}): TrackRepository {
    return {
        save: vi.fn<[Track[]], Promise<void>>(),
        findAll: vi.fn<[], Promise<Track[]>>().mockResolvedValue([]),
        findById: vi.fn<[string], Promise<Track | null>>().mockResolvedValue(null),
        count: vi.fn<[], Promise<number>>().mockResolvedValue(opts.count ?? 0),
        getGenres: vi.fn<[], Promise<GenreCount[]>>().mockResolvedValue(opts.genres ?? []),
        getYears: vi.fn<[], Promise<YearCount[]>>().mockResolvedValue(opts.years ?? []),
    };
}

describe('calculateStats', () => {
    it('returns empty/zeroed stats when the repository is empty', async () => {
        const stats = await calculateStats(makeRepo({}));

        expect(stats.totalTracks).toBe(0);
        expect(stats.totalGenres).toBe(0);
        expect(stats.topGenres).toEqual([]);
        expect(stats.decadeDistribution).toEqual({});
        expect(stats.yearRange).toBeNull();
    });

    it('passes through totalTracks and totalGenres', async () => {
        const genres: GenreCount[] = [
            { genre: 'rock', count: 5 },
            { genre: 'pop', count: 3 },
        ];
        const stats = await calculateStats(makeRepo({ count: 42, genres }));

        expect(stats.totalTracks).toBe(42);
        expect(stats.totalGenres).toBe(2);
    });

    it('limits topGenres to the first 10 (already sorted by the repo)', async () => {
        const genres: GenreCount[] = Array.from({ length: 15 }, (_, i) => ({
            genre: `g${i}`,
            count: 100 - i,
        }));
        const stats = await calculateStats(makeRepo({ genres }));

        expect(stats.topGenres).toHaveLength(10);
        expect(stats.topGenres[0]).toEqual({ genre: 'g0', count: 100 });
        expect(stats.topGenres[9]).toEqual({ genre: 'g9', count: 91 });
    });

    it('aggregates years into decade buckets', async () => {
        const years: YearCount[] = [
            { year: 2021, count: 4 },
            { year: 2015, count: 2 },
            { year: 2011, count: 1 },
            { year: 1999, count: 3 },
            { year: 1990, count: 5 },
        ];
        const stats = await calculateStats(makeRepo({ years }));

        expect(stats.decadeDistribution).toEqual({
            '2020s': 4,
            '2010s': 3,
            '1990s': 8,
        });
    });

    it('computes yearRange with newest first and oldest last', async () => {
        // Repo returns years newest-first; stats uses [0]=newest, [last]=oldest.
        const years: YearCount[] = [
            { year: 2020, count: 1 },
            { year: 2005, count: 1 },
            { year: 1998, count: 1 },
        ];
        const stats = await calculateStats(makeRepo({ years }));

        expect(stats.yearRange).toEqual({ oldest: 1998, newest: 2020 });
    });

    it('handles a single year (oldest equals newest)', async () => {
        const stats = await calculateStats(makeRepo({ years: [{ year: 2008, count: 7 }] }));

        expect(stats.yearRange).toEqual({ oldest: 2008, newest: 2008 });
        expect(stats.decadeDistribution).toEqual({ '2000s': 7 });
    });
});
