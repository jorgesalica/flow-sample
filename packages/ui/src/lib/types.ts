// UI-specific types (not shared with backend)
import type { Track, StatusTone, GenreCount } from '@flows/shared';

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
