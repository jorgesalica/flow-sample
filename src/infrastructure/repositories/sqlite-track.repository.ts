import type { Track, Artist, TrackRepository } from '../../domain/flows/spotify';
import db from '../persistence/sqlite';

interface TrackRow {
  id: string;
  title: string;
  added_at: string | null;
  duration_ms: number | null;
  popularity: number | null;
  album_id: string | null;
  album_name: string | null;
  album_release_date: string | null;
  album_release_year: number | null;
}

interface ArtistRow {
  id: string;
  name: string;
}

interface GenreRow {
  genre: string;
}

export class SQLiteTrackRepository implements TrackRepository {
  async save(tracks: Track[]): Promise<void> {
    const insertTrack = db.prepare(`
      INSERT OR REPLACE INTO tracks (id, title, added_at, duration_ms, popularity, album_id, album_name, album_release_date, album_release_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertArtist = db.prepare(`
      INSERT OR IGNORE INTO artists (id, name) VALUES (?, ?)
    `);

    const insertTrackArtist = db.prepare(`
      INSERT OR IGNORE INTO track_artists (track_id, artist_id) VALUES (?, ?)
    `);

    const insertGenre = db.prepare(`
      INSERT OR IGNORE INTO artist_genres (artist_id, genre) VALUES (?, ?)
    `);

    const transaction = db.transaction((tracks: Track[]) => {
      for (const track of tracks) {
        insertTrack.run(
          track.id,
          track.title,
          track.addedAt,
          track.durationMs,
          track.popularity ?? null,
          track.album.id,
          track.album.name,
          track.album.releaseDate,
          track.album.releaseYear ?? null,
        );

        for (const artist of track.artists) {
          insertArtist.run(artist.id, artist.name);
          insertTrackArtist.run(track.id, artist.id);

          if (artist.genres) {
            for (const genre of artist.genres) {
              insertGenre.run(artist.id, genre);
            }
          }
        }
      }
    });

    transaction(tracks);
  }

  async findAll(): Promise<Track[]> {
    const tracks = db.prepare('SELECT * FROM tracks ORDER BY added_at DESC').all() as TrackRow[];
    return Promise.all(tracks.map((row) => this.hydrate(row)));
  }

  async findById(id: string): Promise<Track | null> {
    const row = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as TrackRow | undefined;
    if (!row) return null;
    return this.hydrate(row);
  }

  async count(): Promise<number> {
    const result = db.prepare('SELECT COUNT(*) as count FROM tracks').get() as { count: number };
    return result.count;
  }

  private async hydrate(row: TrackRow): Promise<Track> {
    const artistRows = db
      .prepare(
        `
      SELECT a.id, a.name
      FROM artists a
      JOIN track_artists ta ON ta.artist_id = a.id
      WHERE ta.track_id = ?
    `,
      )
      .all(row.id) as ArtistRow[];

    const artists: Artist[] = artistRows.map((ar) => {
      const genres = db
        .prepare(
          `
        SELECT genre FROM artist_genres WHERE artist_id = ?
      `,
        )
        .all(ar.id) as GenreRow[];

      return {
        id: ar.id,
        name: ar.name,
        genres: genres.map((g) => g.genre),
      };
    });

    return {
      id: row.id,
      title: row.title,
      addedAt: row.added_at ?? '',
      durationMs: row.duration_ms ?? 0,
      popularity: row.popularity ?? undefined,
      artists,
      album: {
        id: row.album_id ?? '',
        name: row.album_name ?? '',
        releaseDate: row.album_release_date ?? '',
        releaseYear: row.album_release_year ?? undefined,
      },
    };
  }
}
