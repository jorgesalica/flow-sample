import type { Track, Artist, GenreCount, YearCount, TrackRepository } from '@flows/shared';
import { logger } from '@flows/core';
import type Database from 'better-sqlite3';

const log = logger.child({ module: 'SQLiteTrackRepository' });

export type { TrackRepository };

interface TrackRow {
  id: string;
  title: string;
  added_at: string | null;
  duration_ms: number | null;
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
  sortBy?: 'added_at' | 'title';
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
  constructor(private readonly db: Database.Database) {}

  async save(tracks: Track[]): Promise<void> {
    const insertTrack = this.db.prepare(`
      INSERT INTO tracks (id, title, added_at, duration_ms, album_id, album_name, album_release_date, album_release_year, album_image_url, preview_url, spotify_url)
      VALUES (@id, @title, @addedAt, @durationMs, @albumId, @albumName, @releaseDate, @releaseYear, @imageUrl, @previewUrl, @spotifyUrl)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        added_at = excluded.added_at,
        duration_ms = excluded.duration_ms,
        album_id = excluded.album_id,
        album_name = excluded.album_name,
        album_release_date = excluded.album_release_date,
        album_release_year = excluded.album_release_year,
        album_image_url = excluded.album_image_url,
        preview_url = excluded.preview_url,
        spotify_url = excluded.spotify_url
    `);

    const insertArtist = this.db.prepare(`
      INSERT INTO artists (id, name, image_url)
      VALUES (@id, @name, @imageUrl)
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name,
        image_url = excluded.image_url
    `);

    const deleteTrackArtists = this.db.prepare(`DELETE FROM track_artists WHERE track_id = ?`);
    const insertTrackArtist = this.db.prepare(`
      INSERT OR IGNORE INTO track_artists (track_id, artist_id)
      VALUES (?, ?)
    `);

    const insertGenre = this.db.prepare(`
      INSERT OR IGNORE INTO artist_genres (artist_id, genre)
      VALUES (?, ?)
    `);

    const transaction = this.db.transaction((allTracks: Track[]) => {
      for (const track of allTracks) {
        // 1. Safe Track Insert
        insertTrack.run({
          id: track.id,
          title: track.title || 'Unknown Title',
          addedAt: track.addedAt,
          durationMs: track.durationMs,
          albumId: track.album.id,
          albumName: track.album.name || 'Unknown Album',
          releaseDate: track.album.releaseDate,
          releaseYear: track.album.releaseYear ?? null,
          imageUrl: track.album.imageUrl ?? null,
          previewUrl: track.previewUrl ?? null,
          spotifyUrl: track.spotifyUrl ?? null,
        });

        // 2. Clean up existing links to avoid orphans/duplicates
        deleteTrackArtists.run(track.id);

        // 3. Insert Artists and Links
        if (track.artists && track.artists.length > 0) {
          for (const artist of track.artists) {
            if (!artist.id) continue;

            insertArtist.run({
              id: artist.id,
              name: artist.name || 'Unknown Artist',
              imageUrl: artist.imageUrl ?? null,
            });

            insertTrackArtist.run(track.id, artist.id);

            if (artist.genres && artist.genres.length > 0) {
              for (const genre of artist.genres) {
                insertGenre.run(artist.id, genre);
              }
            }
          }
        }
      }
    });

    try {
      transaction(tracks);
      log.info({ count: tracks.length }, 'Saved tracks');
    } catch (e) {
      log.error({ error: e instanceof Error ? e.message : String(e) }, 'Transaction failed');
      throw e;
    }
  }

  async findAll(): Promise<Track[]> {
    const rows = this.db.prepare('SELECT * FROM tracks ORDER BY added_at DESC').all() as TrackRow[];
    return Promise.all(rows.map((r) => this.hydrate(r)));
  }

  async findPaginated(options: SearchOptions = {}): Promise<PaginatedResult<Track>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Full-text search
    if (options.query) {
      conditions.push(`t.id IN (SELECT track_id FROM tracks_fts WHERE tracks_fts MATCH ?)`);
      params.push(`${options.query}*`);
    }

    // Genre filter
    if (options.genre) {
      conditions.push(
        `t.id IN (SELECT ta.track_id FROM track_artists ta JOIN artist_genres ag ON ag.artist_id = ta.artist_id WHERE ag.genre = ?)`,
      );
      params.push(options.genre);
    }

    // Year filter
    if (options.year) {
      conditions.push(`t.album_release_year = ?`);
      params.push(options.year);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Sort
    let orderClause = 'ORDER BY t.added_at DESC';
    if (options.sortBy) {
      const dir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
      switch (options.sortBy) {
        case 'title':
          orderClause = `ORDER BY t.title ${dir}`;
          break;
        case 'added_at':
        default:
          orderClause = `ORDER BY t.added_at ${dir}`;
          break;
      }
    }

    // Count total
    const { count } = this.db
      .prepare(`SELECT COUNT(*) as count FROM tracks t ${whereClause}`)
      .get(...params) as { count: number };

    // Fetch page
    const rows = this.db
      .prepare(`SELECT t.* FROM tracks t ${whereClause} ${orderClause} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as TrackRow[];

    const data = await Promise.all(rows.map((r) => this.hydrate(r)));

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async search(query: string, limit: number = 20): Promise<Track[]> {
    const rows = this.db.prepare(`SELECT t.* FROM tracks t JOIN tracks_fts fts ON fts.track_id = t.id WHERE tracks_fts MATCH ? LIMIT ?`).all(`${query}*`, limit) as TrackRow[];
    return Promise.all(rows.map((r) => this.hydrate(r)));
  }

  async findByGenre(genre: string, limit: number = 50): Promise<Track[]> {
    const rows = this.db.prepare(`SELECT DISTINCT t.* FROM tracks t JOIN track_artists ta ON ta.track_id = t.id JOIN artist_genres ag ON ag.artist_id = ta.artist_id WHERE ag.genre = ? LIMIT ?`).all(genre, limit) as TrackRow[];
    return Promise.all(rows.map((r) => this.hydrate(r)));
  }

  async getGenres(): Promise<GenreCount[]> {
    return this.db
      .prepare(
        `
      SELECT ag.genre, COUNT(DISTINCT ta.track_id) as count
      FROM artist_genres ag
      JOIN track_artists ta ON ta.artist_id = ag.artist_id
      GROUP BY ag.genre
      ORDER BY count DESC
    `,
      )
      .all() as GenreCount[];
  }

  async getYears(): Promise<{ year: number; count: number }[]> {
    return this.db
      .prepare(
        `
      SELECT album_release_year as year, COUNT(*) as count
      FROM tracks
      WHERE album_release_year IS NOT NULL
      GROUP BY album_release_year
      ORDER BY album_release_year DESC
    `,
      )
      .all() as { year: number; count: number }[];
  }

  async findById(id: string): Promise<Track | null> {
    const row = this.db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as TrackRow | undefined;
    if (!row) return null;
    return this.hydrate(row);
  }

  async count(): Promise<number> {
    const { count } = this.db.prepare('SELECT COUNT(*) as count FROM tracks').get() as {
      count: number;
    };
    return count;
  }

  private async hydrate(row: TrackRow): Promise<Track> {
    // Get artists
    const artistRows = this.db
      .prepare(
        `
      SELECT a.* FROM artists a
      JOIN track_artists ta ON ta.artist_id = a.id
      WHERE ta.track_id = ?
    `,
      )
      .all(row.id) as ArtistRow[];

    const artists: Artist[] = await Promise.all(
      artistRows.map(async (a) => {
        const genreRows = this.db
          .prepare(`SELECT genre FROM artist_genres WHERE artist_id = ?`)
          .all(a.id) as GenreRow[];
        return {
          id: a.id,
          name: a.name,
          genres: genreRows.map((g) => g.genre),
          imageUrl: a.image_url ?? undefined,
        };
      }),
    );

    return {
      id: row.id,
      title: row.title,
      artists,
      album: {
        id: row.album_id || '',
        name: row.album_name || '',
        releaseDate: row.album_release_date || '',
        releaseYear: row.album_release_year ?? undefined,
        imageUrl: row.album_image_url ?? undefined,
      },
      addedAt: row.added_at || '',
      durationMs: row.duration_ms || 0,
      previewUrl: row.preview_url ?? undefined,
      spotifyUrl: row.spotify_url ?? undefined,
    };
  }
}
