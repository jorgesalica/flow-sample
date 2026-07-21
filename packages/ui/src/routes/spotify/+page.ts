import type { GenreCount, Track, SearchOptions, YearCount } from '@flows/shared';
import type { TopStats } from '@lib/types';
import { createApiClient } from '@lib/client';
import { mapTopStats } from '@lib/flows/spotify/api';
import type { PageLoad } from './$types';
import { INVALIDATION } from '@lib/invalidation';

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
  genres: GenreCount[];
  years: YearCount[];
  isAuthenticated: boolean;
}

export const load: PageLoad = async ({ depends, fetch }): Promise<SpotifyPageData> => {
  depends(INVALIDATION.SPOTIFY_LIBRARY);
  const api = createApiClient(fetch);
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
      tracks = data.data;
      totalTracks = data.total;
    }
  } catch (e) {
    console.error('Failed to load initial tracks', e);
  }

  // Initial stats — non-critical, defaults to empty on failure.
  let topStats: TopStats = { ...EMPTY_STATS };
  try {
    const { data, error } = await api.api.spotify.stats.get();
    if (!error && data) {
      topStats = mapTopStats(data);
    }
  } catch (e) {
    console.error('Failed to load initial stats', e);
  }

  const [genresResult, yearsResult, authResult] = await Promise.allSettled([
    api.api.spotify.genres.get(),
    api.api.spotify.years.get(),
    api.api.spotify.auth.status.get(),
  ]);

  const genres =
    genresResult.status === 'fulfilled' && !genresResult.value.error
      ? (genresResult.value.data ?? [])
      : [];
  const years =
    yearsResult.status === 'fulfilled' && !yearsResult.value.error
      ? (yearsResult.value.data ?? [])
      : [];
  const isAuthenticated =
    authResult.status === 'fulfilled' && !authResult.value.error
      ? Boolean(authResult.value.data?.connected)
      : false;

  return { tracks, totalTracks, searchOptions, topStats, genres, years, isAuthenticated };
};
