import type Database from 'better-sqlite3';

export interface LyricsCanvasTrack {
  id: string;
  title: string;
  artist: string;
  imageUrl: string | null;
  plainLyrics: string | null;
}

interface TrackDetailsRow {
  id: string;
  title: string;
  imageUrl: string | null;
  artist: string | null;
  plainLyrics: string | null;
}

export interface LyricsCanvasRepository {
  findTrackDetails(trackId: string): LyricsCanvasTrack | null;
}

export class SQLiteLyricsCanvasRepository implements LyricsCanvasRepository {
  constructor(private readonly db: Database.Database) {}

  findTrackDetails(trackId: string): LyricsCanvasTrack | null {
    const row = this.db
      .prepare(
        `
        SELECT
          t.id,
          t.title,
          t.album_image_url AS imageUrl,
          GROUP_CONCAT(a.name, ', ') AS artist,
          l.plain_lyrics AS plainLyrics
        FROM tracks t
        LEFT JOIN track_artists ta ON t.id = ta.track_id
        LEFT JOIN artists a ON ta.artist_id = a.id
        LEFT JOIN lyrics l ON t.id = l.track_id
        WHERE t.id = ?
        GROUP BY t.id
      `,
      )
      .get(trackId) as TrackDetailsRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      artist: row.artist ?? 'Unknown Artist',
      imageUrl: row.imageUrl,
      plainLyrics: row.plainLyrics,
    };
  }
}
