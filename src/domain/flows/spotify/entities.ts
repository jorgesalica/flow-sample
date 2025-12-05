/**
 * Spotify Flow Domain Entities
 */

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
