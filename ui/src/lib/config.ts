/**
 * UI Configuration
 */

export const API_BASE = '';

export const ENDPOINTS = {
    SPOTIFY_RUN: '/api/spotify/run',
    LIKED_SONGS: '/api/spotify/tracks',
} as const;

export const APP_CONFIG = {
    title: 'Spotify Flow Explorer',
    tagline: 'Drifting through your musical history.',
} as const;
