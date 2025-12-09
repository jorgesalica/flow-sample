import db from '@infra/persistence/sqlite';
import { logger } from '@infra/logger';

const log = logger.child({ module: 'SQLiteLyricsRepository' });

export type LyricsStatus = 'pending' | 'found' | 'not_found';

export interface LyricsRow {
  track_id: string;
  plain_lyrics: string | null;
  synced_lyrics: string | null;
  status: LyricsStatus;
  fetched_at: string | null;
}

export interface LyricsData {
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export interface Lyrics {
  trackId: string;
  plainLyrics: string | null;
  syncedLyrics: string | null;
  status: LyricsStatus;
  fetchedAt: string | null;
}

export class SQLiteLyricsRepository {
  /**
   * Find lyrics by track ID
   */
  async findByTrackId(trackId: string): Promise<Lyrics | null> {
    const row = db
      .prepare(
        `SELECT track_id, plain_lyrics, synced_lyrics, status, fetched_at 
         FROM lyrics WHERE track_id = ?`,
      )
      .get(trackId) as LyricsRow | undefined;

    if (!row) {
      return null;
    }

    return this.hydrate(row);
  }

  /**
   * Save lyrics for a track (status = 'found')
   */
  async save(trackId: string, lyrics: LyricsData): Promise<void> {
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO lyrics (track_id, plain_lyrics, synced_lyrics, status, fetched_at)
       VALUES (?, ?, ?, 'found', ?)
       ON CONFLICT(track_id) DO UPDATE SET
         plain_lyrics = excluded.plain_lyrics,
         synced_lyrics = excluded.synced_lyrics,
         status = 'found',
         fetched_at = excluded.fetched_at`,
    ).run(trackId, lyrics.plainLyrics, lyrics.syncedLyrics, now);

    log.debug({ trackId }, 'Saved lyrics');
  }

  /**
   * Mark a track as having no lyrics available (status = 'not_found')
   */
  async markNotFound(trackId: string): Promise<void> {
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO lyrics (track_id, status, fetched_at)
       VALUES (?, 'not_found', ?)
       ON CONFLICT(track_id) DO UPDATE SET
         status = 'not_found',
         fetched_at = excluded.fetched_at`,
    ).run(trackId, now);

    log.debug({ trackId }, 'Marked lyrics not found');
  }

  /**
   * Get all track IDs that don't have lyrics fetched yet
   */
  async getPendingTrackIds(): Promise<string[]> {
    const rows = db
      .prepare(
        `SELECT t.id FROM tracks t
         LEFT JOIN lyrics l ON l.track_id = t.id
         WHERE l.track_id IS NULL OR l.status = 'pending'`,
      )
      .all() as { id: string }[];

    return rows.map((r) => r.id);
  }

  /**
   * Get lyrics statistics
   */
  async getStats(): Promise<{ total: number; found: number; notFound: number; pending: number }> {
    const totalTracks = (db.prepare('SELECT COUNT(*) as c FROM tracks').get() as { c: number }).c;

    const stats = db
      .prepare(
        `SELECT 
           SUM(CASE WHEN status = 'found' THEN 1 ELSE 0 END) as found,
           SUM(CASE WHEN status = 'not_found' THEN 1 ELSE 0 END) as not_found
         FROM lyrics`,
      )
      .get() as { found: number; not_found: number };

    const found = stats.found || 0;
    const notFound = stats.not_found || 0;
    const pending = totalTracks - found - notFound;

    return { total: totalTracks, found, notFound, pending };
  }

  private hydrate(row: LyricsRow): Lyrics {
    return {
      trackId: row.track_id,
      plainLyrics: row.plain_lyrics,
      syncedLyrics: row.synced_lyrics,
      status: row.status,
      fetchedAt: row.fetched_at,
    };
  }
}
