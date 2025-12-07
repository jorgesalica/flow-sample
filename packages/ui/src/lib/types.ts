// Re-export types from shared package
export type { Artist, Album, Track, SearchOptions, PaginatedResult } from '@flows/shared';

// UI-specific types
export type TimeFilter = 'all' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

export interface AppState {
  tracks: import('@flows/shared').Track[];
  filter: TimeFilter;
  status: string;
  statusTone: 'info' | 'success' | 'warning' | 'error';
  isLoading: boolean;
}

export interface TopStats {
  total: number;
  artists: number;
  topGenre: string;
  genres: { genre: string; count: number }[];
  decadeDistribution: Record<string, number>;
}
