import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { SQLiteLyricsCanvasRepository } from '../../../src/backend/canvas/repository';

const db = new Database(':memory:');

db.exec(`
  CREATE TABLE tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    album_image_url TEXT
  );

  CREATE TABLE artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE track_artists (
    track_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    PRIMARY KEY (track_id, artist_id)
  );

  CREATE TABLE lyrics (
    track_id TEXT PRIMARY KEY,
    plain_lyrics TEXT
  );
`);

describe('SQLiteLyricsCanvasRepository', () => {
  const repository = new SQLiteLyricsCanvasRepository(db);

  beforeEach(() => {
    db.exec('DELETE FROM lyrics; DELETE FROM track_artists; DELETE FROM artists; DELETE FROM tracks;');
  });

  it('returns null when the track is missing', () => {
    expect(repository.findTrackDetails('missing')).toBeNull();
  });

  it('hydrates track metadata, artists, image and lyrics', () => {
    db.prepare('INSERT INTO tracks (id, title, album_image_url) VALUES (?, ?, ?)').run(
      'track-1',
      'A Song',
      'https://example.test/cover.jpg',
    );
    db.prepare('INSERT INTO artists (id, name) VALUES (?, ?)').run('artist-1', 'First Artist');
    db.prepare('INSERT INTO artists (id, name) VALUES (?, ?)').run('artist-2', 'Second Artist');
    db.prepare('INSERT INTO track_artists (track_id, artist_id) VALUES (?, ?)').run('track-1', 'artist-1');
    db.prepare('INSERT INTO track_artists (track_id, artist_id) VALUES (?, ?)').run('track-1', 'artist-2');
    db.prepare('INSERT INTO lyrics (track_id, plain_lyrics) VALUES (?, ?)').run('track-1', 'Line one');

    expect(repository.findTrackDetails('track-1')).toEqual({
      id: 'track-1',
      title: 'A Song',
      artist: 'First Artist, Second Artist',
      imageUrl: 'https://example.test/cover.jpg',
      plainLyrics: 'Line one',
    });
  });

  it('uses a stable fallback when a track has no artists', () => {
    db.prepare('INSERT INTO tracks (id, title) VALUES (?, ?)').run('track-1', 'Untitled');

    expect(repository.findTrackDetails('track-1')).toMatchObject({
      id: 'track-1',
      artist: 'Unknown Artist',
      plainLyrics: null,
    });
  });
});
