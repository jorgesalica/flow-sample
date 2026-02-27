/**
 * Lyrics Flow Types
 */

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
