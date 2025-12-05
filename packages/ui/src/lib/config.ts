/**
 * UI Configuration
 */

export const API_BASE = '';

export const ENDPOINTS = {
    SPOTIFY_RUN: '/api/spotify/run',
    TRACKS_SEARCH: '/api/spotify/tracks/search',
    STATS: '/api/spotify/stats',
    GENRES: '/api/spotify/genres',
    YEARS: '/api/spotify/years',
} as const;

export const APP_CONFIG = {
    title: 'Spotify Flow Explorer',
    tagline: 'Drifting through your musical history.',
} as const;
