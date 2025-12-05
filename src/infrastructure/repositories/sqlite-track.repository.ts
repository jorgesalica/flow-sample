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
  album_image_url: string | null;
  preview_url: string | null;
  spotify_url: string | null;
}

interface ArtistRow {
  id: string;
  name: string;
  image_url: string | null;
}

interface GenreRow {
  genre: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface SearchOptions extends PaginationOptions {
  query?: string;
  genre?: string;
  year?: number;
  sortBy?: 'added_at' | 'popularity' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SQLiteTrackRepository implements TrackRepository {
  async save(tracks: Track[]): Promise<void> {
    const insertTrack = db.prepare(`
      INSERT OR REPLACE INTO tracks (id, title, added_at, duration_ms, popularity, album_id, album_name, album_release_date, album_release_year, album_image_url, preview_url, spotify_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertArtist = db.prepare(`
      INSERT OR REPLACE INTO artists (id, name, image_url) VALUES (?, ?, ?)
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
          track.album.imageUrl ?? null,
          track.previewUrl ?? null,
          track.spotifyUrl ?? null,
        );

        for (const artist of track.artists) {
          insertArtist.run(artist.id, artist.name, artist.imageUrl ?? null);
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

  async findPaginated(options: SearchOptions = {}): Promise<PaginatedResult<Track>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy ?? 'added_at';
    const sortOrder = options.sortOrder ?? 'desc';

    let whereClause = '1=1';
    const params: (string | number)[] = [];

    // Filter by genre
    if (options.genre) {
      whereClause += ` AND t.id IN (
        SELECT ta.track_id FROM track_artists ta
        JOIN artist_genres ag ON ag.artist_id = ta.artist_id
        WHERE ag.genre = ?
      )`;
      params.push(options.genre);
    }

    // Filter by year
    if (options.year) {
      whereClause += ' AND t.album_release_year = ?';
      params.push(options.year);
    }

    // Search query (simple LIKE for now, FTS later)
    if (options.query) {
      whereClause += ` AND (
        t.title LIKE ? OR
        t.album_name LIKE ? OR
        t.id IN (
          SELECT ta.track_id FROM track_artists ta
          JOIN artists a ON a.id = ta.artist_id
          WHERE a.name LIKE ?
        )
      )`;
      const searchTerm = `%${options.query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as count FROM tracks t WHERE ${whereClause}`;
    const countResult = db.prepare(countQuery).get(...params) as { count: number };
    const total = countResult.count;

    // Fetch paginated tracks
    const query = `
      SELECT t.* FROM tracks t
      WHERE ${whereClause}
      ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);
    const tracks = db.prepare(query).all(...params) as TrackRow[];

    const data = await Promise.all(tracks.map((row) => this.hydrate(row)));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async search(query: string, limit: number = 20): Promise<Track[]> {
    const result = await this.findPaginated({ query, limit, page: 1 });
    return result.data;
  }

  async findByGenre(genre: string, limit: number = 50): Promise<Track[]> {
    const result = await this.findPaginated({ genre, limit, page: 1 });
    return result.data;
  }

  async getGenres(): Promise<{ genre: string; count: number }[]> {
    const result = db
      .prepare(
        `
      SELECT ag.genre, COUNT(DISTINCT ta.track_id) as count
      FROM artist_genres ag
      JOIN track_artists ta ON ta.artist_id = ag.artist_id
      GROUP BY ag.genre
      ORDER BY count DESC
    `,
      )
      .all() as { genre: string; count: number }[];
    return result;
  }

  async getYears(): Promise<{ year: number; count: number }[]> {
    const result = db
      .prepare(
        `
      SELECT album_release_year as year, COUNT(*) as count
      FROM tracks
      WHERE album_release_year IS NOT NULL
      GROUP BY album_release_year
      ORDER BY year DESC
    `,
      )
      .all() as { year: number; count: number }[];
    return result;
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
      SELECT a.id, a.name, a.image_url
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
        imageUrl: ar.image_url ?? undefined,
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
        imageUrl: row.album_image_url ?? undefined,
      },
      previewUrl: row.preview_url ?? undefined,
      spotifyUrl: row.spotify_url ?? undefined,
    };
  }
}
