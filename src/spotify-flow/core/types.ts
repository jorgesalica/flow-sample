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
    // Raw data for debugging or specific adapters
    raw?: any;
}

export interface FlowOptions {
    limit?: number;
    actions: {
        export: boolean;
        enrich: boolean;
        compact: boolean;
    };
}
