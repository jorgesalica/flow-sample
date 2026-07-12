import { createDatabase } from '@flows/core';
import type Database from 'better-sqlite3';

// Shared persistence for music-domain flows.
export const musicDb: Database.Database = createDatabase('music.db');

// Enable foreign keys
musicDb.pragma('foreign_keys = ON');

// Run migrations
musicDb.exec(`
  -- Core tables
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

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tracks_album_year ON tracks(album_release_year DESC);
  CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
  CREATE INDEX IF NOT EXISTS idx_artist_genres_genre ON artist_genres(genre);

`);

// FTS5 Full-text search (standalone table, manually synced)
try {
  musicDb.exec(`DROP TABLE IF EXISTS tracks_fts`);
} catch {
  // Table might not exist, that's ok
}
musicDb.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
    track_id,
    title,
    album_name,
    artist_names
  );
`);

// Function to rebuild FTS index (call after bulk inserts)
export function rebuildFtsIndex() {
  const tracks = musicDb
    .prepare(
      `
    SELECT t.rowid, t.id, t.title, t.album_name,
           GROUP_CONCAT(a.name, ' ') as artist_names
    FROM tracks t
    LEFT JOIN track_artists ta ON ta.track_id = t.id
    LEFT JOIN artists a ON a.id = ta.artist_id
    GROUP BY t.id
  `,
    )
    .all() as {
      rowid: number;
      id: string;
      title: string;
      album_name: string;
      artist_names: string;
    }[];

  // Clear and rebuild
  musicDb.exec(`DELETE FROM tracks_fts`);

  const insertFts = musicDb.prepare(`
    INSERT INTO tracks_fts(track_id, title, album_name, artist_names)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = musicDb.transaction(() => {
    for (const t of tracks) {
      insertFts.run(t.id, t.title, t.album_name || '', t.artist_names || '');
    }
  });

  transaction();
}

// Build FTS index on startup if empty
const ftsCount = musicDb.prepare('SELECT COUNT(*) as c FROM tracks_fts').get() as { c: number };
const tracksCount = musicDb.prepare('SELECT COUNT(*) as c FROM tracks').get() as { c: number };
if (ftsCount.c === 0 && tracksCount.c > 0) {
  rebuildFtsIndex();
}

export default musicDb;
