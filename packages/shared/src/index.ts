/**
 * Shared Domain Entities
 * Used by both backend and UI
 */

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

// Aggregation types
export interface GenreCount {
    genre: string;
    count: number;
}

export interface YearCount {
    year: number;
    count: number;
}

// UI types
export type StatusTone = 'info' | 'success' | 'warning' | 'error';

export interface StatusMessage {
    message: string;
    tone: StatusTone;
}

// Search & Pagination
export interface SearchOptions {
    page?: number;
    limit?: number;
    q?: string;
    genre?: string;
    year?: number;
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

// UI component types
export interface SelectOption {
    value: string;
    label: string;
}

// Stats types
export interface YearRange {
    oldest: number;
    newest: number;
}

// Lyrics types
export type LyricsStatus = 'pending' | 'found' | 'not_found';

export interface Lyrics {
    trackId: string;
    plainLyrics: string | null;
    syncedLyrics: string | null;
    status: LyricsStatus;
    fetchedAt: string | null;
}

export interface LyricsStats {
    total: number;
    found: number;
    notFound: number;
    pending: number;
}
