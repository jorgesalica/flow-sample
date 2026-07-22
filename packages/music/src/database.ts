import { createDatabase } from '@flows/core';
import type Database from 'better-sqlite3';

const MUSIC_DATABASE_NAME = 'music.db';

export function createMusicDatabase(dataDir?: string): Database.Database {
  const db = createDatabase(MUSIC_DATABASE_NAME, dataDir);
  initializeMusicDatabase(db);
  return db;
}

export function initializeMusicDatabase(db: Database.Database): void {
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      added_at TEXT,
      duration_ms INTEGER,
      album_id TEXT,
      album_name TEXT,
      album_release_date TEXT,
      album_release_year INTEGER,
      album_image_url TEXT,
      preview_url TEXT,
      spotify_url TEXT
    );

    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS track_artists (
      track_id TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      PRIMARY KEY (track_id, artist_id),
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    );

    CREATE TABLE IF NOT EXISTS artist_genres (
      artist_id TEXT NOT NULL,
      genre TEXT NOT NULL,
      PRIMARY KEY (artist_id, genre),
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tracks_album_year ON tracks(album_release_year DESC);
    CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
    CREATE INDEX IF NOT EXISTS idx_artist_genres_genre ON artist_genres(genre);
  `);

  // The FTS table is standalone and rebuilt from canonical track data.
  db.exec('DROP TABLE IF EXISTS tracks_fts');
  db.exec(`
    CREATE VIRTUAL TABLE tracks_fts USING fts5(
      track_id,
      title,
      album_name,
      artist_names
    );
  `);

  const tracksCount = db.prepare('SELECT COUNT(*) as c FROM tracks').get() as {
    c: number;
  };
  if (tracksCount.c > 0) {
    rebuildFtsIndex(db);
  }
}

export function rebuildFtsIndex(db: Database.Database): void {
  const tracks = db
    .prepare(
      `
        SELECT t.id, t.title, t.album_name,
               GROUP_CONCAT(a.name, ' ') as artist_names
        FROM tracks t
        LEFT JOIN track_artists ta ON ta.track_id = t.id
        LEFT JOIN artists a ON a.id = ta.artist_id
        GROUP BY t.id
      `,
    )
    .all() as Array<{
      id: string;
      title: string;
      album_name: string | null;
      artist_names: string | null;
    }>;

  db.exec('DELETE FROM tracks_fts');
  const insertFts = db.prepare(`
    INSERT INTO tracks_fts(track_id, title, album_name, artist_names)
    VALUES (?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const track of tracks) {
      insertFts.run(
        track.id,
        track.title,
        track.album_name ?? '',
        track.artist_names ?? '',
      );
    }
  })();
}
