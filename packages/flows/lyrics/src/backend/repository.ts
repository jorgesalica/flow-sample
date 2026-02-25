import type { LyricsStatus } from '@flows/shared';
import { musicDb } from '@flows/spotify/src/backend/database';
import { logger } from '@flows/core';

const log = logger.child({ module: 'SQLiteLyricsRepository' });

interface LyricsRow {
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

export interface LyricsRecord {
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
  async findByTrackId(trackId: string): Promise<LyricsRecord | null> {
    const row = musicDb
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

    musicDb.prepare(
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

    musicDb.prepare(
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
   * @param includeFailed If true, also returns tracks with status 'not_found'
   */
  async getPendingTrackIds(includeFailed = false): Promise<string[]> {
    let query = `SELECT t.id FROM tracks t
         LEFT JOIN lyrics l ON l.track_id = t.id
         WHERE l.track_id IS NULL OR l.status = 'pending'`;

    if (includeFailed) {
      query += ` OR l.status = 'not_found'`;
    }

    const rows = musicDb.prepare(query).all() as { id: string }[];

    return rows.map((r) => r.id);
  }

  /**
   * Get lyrics statistics
   */
  async getStats(): Promise<{ total: number; found: number; notFound: number; pending: number }> {
    const totalTracks = (musicDb.prepare('SELECT COUNT(*) as c FROM tracks').get() as { c: number }).c;

    const stats = musicDb
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

  /**
   * Get library tracks with lyrics status
   */
  async getLibraryWithStatus(
    limit = 50,
    offset = 0,
    statusFilter?: LyricsStatus,
  ): Promise<
    Array<{
      id: string;
      title: string;
      artist: string;
      imageUrl: string | null;
      status: LyricsStatus;
    }>
  > {
    let query = `
        SELECT 
           t.id, 
           t.title, 
           t.album_image_url as imageUrl,
           GROUP_CONCAT(a.name, ', ') as artist, 
           COALESCE(l.status, 'pending') as status
         FROM tracks t
         JOIN track_artists ta ON t.id = ta.track_id
         JOIN artists a ON ta.artist_id = a.id
         LEFT JOIN lyrics l ON t.id = l.track_id
    `;

    const params: (string | number)[] = [];

    if (statusFilter) {
      if (statusFilter === 'pending') {
        query += ` WHERE l.status = 'pending' OR l.status IS NULL`;
      } else {
        query += ` WHERE l.status = ?`;
        params.push(statusFilter);
      }
    }

    query += `
         GROUP BY t.id
         ORDER BY t.added_at DESC
         LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const rows = musicDb.prepare(query).all(...params) as Array<{
      id: string;
      title: string;
      imageUrl: string | null;
      artist: string;
      status: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      imageUrl: r.imageUrl,
      status: r.status as LyricsStatus,
    }));
  }

  private hydrate(row: LyricsRow): LyricsRecord {
    return {
      trackId: row.track_id,
      plainLyrics: row.plain_lyrics,
      syncedLyrics: row.synced_lyrics,
      status: row.status,
      fetchedAt: row.fetched_at,
    };
  }
}
