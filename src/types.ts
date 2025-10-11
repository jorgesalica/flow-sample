export type AudioFeaturesMode = 'none' | 'user' | 'client';

export interface ArtistRef {
  id: string | null;
  name: string;
}

export interface LikedTrackRecord {
  track_id: string;
  track_name: string;
  artists: ArtistRef[];
  added_at: string;
  artist_ids?: string[];
  valence?: number | null;
  energy?: number | null;
  danceability?: number | null;
  tempo?: number | null;
}

export interface EnrichedArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number | null;
  followersTotal: number | null;
  spotifyUrl: string | null;
}

export interface EnrichedAlbum {
  id: string | null;
  name: string;
  release_date: string | null;
  release_date_precision: string | null;
  total_tracks: number | null;
  album_type: string | null;
  images: { url: string; width?: number; height?: number }[];
  spotifyUrl: string | null;
  image_300?: string;
  album_spotify_url?: string | null;
}

export interface EnrichedTrackRecord extends LikedTrackRecord {
  artists_joined?: string;
  duration_ms: number | null;
  explicit: boolean | null;
  popularity: number | null;
  preview_url: string | null;
  available_markets?: string[];
  markets_count?: number | null;
  external_ids?: { isrc?: string };
  external_urls?: { spotify?: string };
  album: EnrichedAlbum | null;
  artistas_enriquecidos: EnrichedArtist[];
  year: string | null;
  track_spotify_url?: string | null;
  artist_genres?: string[];
  artist_genres_joined?: string;
  version_flags?: {
    is_live?: boolean;
    is_remix?: boolean;
    is_extended?: boolean;
    is_instrumental?: boolean;
  };
}

export interface CompactTrackRecord {
  track_id: string;
  track_name: string;
  added_at: string;
  artists: { id?: string; name: string }[];
  album: {
    id?: string;
    name: string;
    release_date?: string;
    image_300?: string;
    album_spotify_url?: string;
  };
  track_spotify_url: string;
  year?: string;
  artist_genres?: string[];
  popularity?: number;
  explicit?: boolean;
  version_flags?: {
    is_live?: boolean;
    is_remix?: boolean;
    is_extended?: boolean;
    is_instrumental?: boolean;
  };
  isrc?: string;
}

export interface CliOptions {
  actions: {
    export: boolean;
    enrich: boolean;
    compact: boolean;
  };
  inputPath: string;
  inputProvided: boolean;
  help: boolean;
}
