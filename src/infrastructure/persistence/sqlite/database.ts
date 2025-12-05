import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'data', 'flow.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable foreign keys and performance settings
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run migrations
db.exec(`
  -- Core tables
  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    added_at TEXT,
    duration_ms INTEGER,
    popularity INTEGER,
    album_id TEXT,
    album_name TEXT,
    album_release_date TEXT,
    album_release_year INTEGER,
    album_image_url TEXT,
    preview_url TEXT
  );

  CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS track_artists (
    track_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    PRIMARY KEY (track_id, artist_id),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS artist_genres (
    artist_id TEXT NOT NULL,
    genre TEXT NOT NULL,
    PRIMARY KEY (artist_id, genre),
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tracks_popularity ON tracks(popularity DESC);
  CREATE INDEX IF NOT EXISTS idx_tracks_album_year ON tracks(album_release_year DESC);
  CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
  CREATE INDEX IF NOT EXISTS idx_artist_genres_genre ON artist_genres(genre);

  -- Token cache for Spotify access tokens
  CREATE TABLE IF NOT EXISTS token_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

// Migration: Add new columns if they don't exist
try {
  db.exec(`ALTER TABLE tracks ADD COLUMN album_image_url TEXT`);
} catch {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE tracks ADD COLUMN preview_url TEXT`);
} catch {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE tracks ADD COLUMN spotify_url TEXT`);
} catch {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE artists ADD COLUMN image_url TEXT`);
} catch {
  // Column already exists
}

export default db;
