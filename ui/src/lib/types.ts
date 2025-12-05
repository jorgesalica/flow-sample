export interface Artist {
  id: string;
  name: string;
  genres?: string[];
  imageUrl?: string;
}

export interface Album {
  id: string;
  name: string;
  releaseDate: string;
  releaseYear?: number;
  imageUrl?: string;
}

export interface Track {
  id: string;
  title: string;
  artists: Artist[];
  album: Album;
  addedAt: string;
  durationMs: number;
  popularity?: number;
  previewUrl?: string;
  spotifyUrl?: string;
}

export type TimeFilter = 'all' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

export interface SearchOptions {
  page?: number;
  limit?: number;
  q?: string;
  genre?: string;
  year?: number;
  hasPreview?: boolean;
  minPopularity?: number;
  sortBy?: 'added_at' | 'popularity' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AppState {
  tracks: Track[];
  filter: TimeFilter;
  status: string;
  statusTone: 'info' | 'success' | 'warning' | 'error';
  isLoading: boolean;
}
