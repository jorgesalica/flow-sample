// Re-export types from shared package
export type {
  Artist,
  Album,
  Track,
  SearchOptions,
  PaginatedResult,
  GenreCount,
  YearCount,
  StatusTone,
  StatusMessage,
  SelectOption,
  YearRange,
  Lyrics,
  LyricsStatus,
  LyricsStats,
} from '@flows/shared';

import type { Track, StatusTone, GenreCount } from '@flows/shared';

// UI-specific types
export type TimeFilter = 'all' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

export interface AppState {
  tracks: Track[];
  filter: TimeFilter;
  status: string;
  statusTone: StatusTone;
  isLoading: boolean;
}

export interface TopStats {
  total: number;
  artists: number;
  topGenre: string;
  genres: GenreCount[];
  decadeDistribution: Record<string, number>;
}
