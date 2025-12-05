export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtistSimple {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbumSimple {
  id: string;
  name: string;
  release_date: string;
  total_tracks: number;
  images: SpotifyImage[];
  artists: SpotifyArtistSimple[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  album: SpotifyAlbumSimple;
  artists: SpotifyArtistSimple[];
}

export interface SpotifySavedTrack {
  added_at: string;
  track: SpotifyTrack;
}

export interface SpotifyPaging<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}
