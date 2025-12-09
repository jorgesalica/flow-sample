/**
 * LrcLib API Response Types
 */

export interface LrcLibResponse {
    id: number;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string | null;
    syncedLyrics: string | null;
}

export interface LrcLibSearchResult {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string | null;
    syncedLyrics: string | null;
}

export interface LyricsResult {
    plainLyrics: string | null;
    syncedLyrics: string | null;
    instrumental: boolean;
}
