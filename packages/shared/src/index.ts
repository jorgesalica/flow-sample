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
    spotifyUrl?: string;
}

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
