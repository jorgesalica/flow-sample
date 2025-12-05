/**
 * Spotify Flow Domain Entities
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
