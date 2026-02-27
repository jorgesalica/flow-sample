import type { GenreCount, YearRange } from '@flows/shared';
import type { TrackRepository } from './repository';

export interface TopStats {
  totalTracks: number;
  totalGenres: number;
  topGenres: GenreCount[];
  decadeDistribution: Record<string, number>;
  yearRange: YearRange | null;
}

/**
 * Calculates aggregated statistics from track repository data
 */
export async function calculateStats(repository: TrackRepository): Promise<TopStats> {
  const [count, genres, years] = await Promise.all([
    repository.count(),
    repository.getGenres(),
    repository.getYears(),
  ]);

  const topGenres = genres.slice(0, 10);
  const decadeDistribution: Record<string, number> = {};

  for (const { year, count } of years) {
    const decade = Math.floor(year / 10) * 10;
    const decadeKey = `${decade}s`;
    decadeDistribution[decadeKey] = (decadeDistribution[decadeKey] || 0) + count;
  }

  return {
    totalTracks: count,
    totalGenres: genres.length,
    topGenres,
    decadeDistribution,
    yearRange:
      years.length > 0
        ? {
          oldest: years[years.length - 1]?.year,
          newest: years[0]?.year,
        }
        : null,
  };
}
