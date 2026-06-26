import type { Track, PaginatedResult, SearchOptions } from '@flows/shared';
import type { TopStats } from '@lib/types';
import { api } from '@lib/client';
import { mapTopStats } from '@lib/flows/spotify/api';
import type { PageLoad } from './$types';

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  page: 1,
  limit: 24,
  q: '',
  sortBy: 'added_at',
  sortOrder: 'desc',
};

const EMPTY_STATS: TopStats = {
  total: 0,
  artists: 0,
  topGenre: '—',
  genres: [],
  decadeDistribution: {},
};

export interface SpotifyPageData {
  tracks: Track[];
  totalTracks: number;
  searchOptions: SearchOptions;
  topStats: TopStats;
}

export const load: PageLoad = async (): Promise<SpotifyPageData> => {
  const searchOptions = { ...DEFAULT_SEARCH_OPTIONS };

  // Initial tracks (page 1, no filters).
  let tracks: Track[] = [];
  let totalTracks = 0;
  try {
    const { data, error } = await api.api.spotify.tracks.search.get({
      query: {
        page: searchOptions.page,
        limit: searchOptions.limit,
        q: searchOptions.q,
        genre: searchOptions.genre,
        year: searchOptions.year,
        sortBy: searchOptions.sortBy,
        sortOrder: searchOptions.sortOrder,
      },
    });
    if (!error && data) {
      const result = data as unknown as PaginatedResult<Track>;
      tracks = result.data;
      totalTracks = result.total;
    }
  } catch (e) {
    console.error('Failed to load initial tracks', e);
  }

  // Initial stats — non-critical, defaults to empty on failure.
  let topStats: TopStats = { ...EMPTY_STATS };
  try {
    const { data, error } = await api.api.spotify.stats.get();
    if (!error && data) {
      topStats = mapTopStats(data as unknown as Record<string, unknown>);
    }
  } catch (e) {
    console.error('Failed to load initial stats', e);
  }

  return { tracks, totalTracks, searchOptions, topStats };
};
