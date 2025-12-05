export interface Artist {
  id: string;
  name: string;
  genres?: string[];
}

export interface Album {
  id: string;
  name: string;
  releaseDate: string;
  releaseYear?: number;
}

export interface Track {
  id: string;
  title: string;
  artists: Artist[];
  album: Album;
  addedAt: string;
  durationMs: number;
  popularity?: number;
}

export type TimeFilter = 'all' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

export interface AppState {
  tracks: Track[];
  filter: TimeFilter;
  status: string;
  statusTone: 'info' | 'success' | 'warning' | 'error';
  isLoading: boolean;
}
