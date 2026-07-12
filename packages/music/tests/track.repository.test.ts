import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { Track } from '@flows/shared';

// In-memory DB shared across the mock and tests. The repository imports
// `musicDb` from './database', so we mock that module with a real
// in-memory better-sqlite3 instance (mock the edge, run the real SQL).
const testDb = new Database(':memory:');
testDb.pragma('foreign_keys = ON');

testDb.exec(`
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
  CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
    track_id, title, album_name, artist_names
  );
`);

vi.mock('../src/database', () => ({ musicDb: testDb }));

const { SQLiteTrackRepository } = await import('../src/track.repository');

// ── Fixture factory ───────────────────────────────────────────────────
function makeTrack(overrides: Partial<Track> = {}): Track {
    return {
        id: 't1',
        title: 'Test Song',
        artists: [{ id: 'a1', name: 'The Mock Band', genres: ['rock'] }],
        album: {
            id: 'alb1',
            name: 'Mock Album',
            releaseDate: '2010-05-01',
            releaseYear: 2010,
            imageUrl: 'https://img.mock.test/alb1.jpg',
        },
        addedAt: '2024-01-01T00:00:00.000Z',
        durationMs: 180000,
        previewUrl: 'https://preview.mock.test/t1.mp3',
        spotifyUrl: 'https://open.spotify.com/track/t1',
        ...overrides,
    };
}

function rebuildFts() {
    // Mirror the real database.rebuildFtsIndex enough for search tests.
    const rows = testDb
        .prepare(
            `SELECT t.id, t.title, t.album_name,
                    GROUP_CONCAT(a.name, ' ') as artist_names
             FROM tracks t
             LEFT JOIN track_artists ta ON ta.track_id = t.id
             LEFT JOIN artists a ON a.id = ta.artist_id
             GROUP BY t.id`,
        )
        .all() as { id: string; title: string; album_name: string; artist_names: string }[];
    testDb.exec('DELETE FROM tracks_fts');
    const ins = testDb.prepare(
        'INSERT INTO tracks_fts(track_id, title, album_name, artist_names) VALUES (?, ?, ?, ?)',
    );
    for (const r of rows) ins.run(r.id, r.title, r.album_name || '', r.artist_names || '');
}

describe('SQLiteTrackRepository', () => {
    let repo: InstanceType<typeof SQLiteTrackRepository>;

    beforeEach(() => {
        testDb.exec(
            'DELETE FROM artist_genres; DELETE FROM track_artists; DELETE FROM artists; DELETE FROM tracks; DELETE FROM tracks_fts;',
        );
        repo = new SQLiteTrackRepository();
    });

    describe('save', () => {
        it('inserts a track plus its artists and genres', async () => {
            await repo.save([makeTrack()]);

            const trackRow = testDb.prepare('SELECT * FROM tracks WHERE id = ?').get('t1') as {
                title: string;
                album_name: string;
                album_release_year: number;
            };
            expect(trackRow.title).toBe('Test Song');
            expect(trackRow.album_name).toBe('Mock Album');
            expect(trackRow.album_release_year).toBe(2010);

            const artistRow = testDb.prepare('SELECT * FROM artists WHERE id = ?').get('a1') as {
                name: string;
            };
            expect(artistRow.name).toBe('The Mock Band');

            const link = testDb
                .prepare('SELECT * FROM track_artists WHERE track_id = ? AND artist_id = ?')
                .get('t1', 'a1');
            expect(link).toBeDefined();

            const genres = testDb
                .prepare('SELECT genre FROM artist_genres WHERE artist_id = ?')
                .all('a1') as { genre: string }[];
            expect(genres.map((g) => g.genre)).toEqual(['rock']);
        });

        it('falls back to default labels for empty title/album/artist names', async () => {
            await repo.save([
                makeTrack({
                    title: '',
                    album: { id: '', name: '', releaseDate: '', releaseYear: undefined },
                    artists: [{ id: 'a1', name: '' }],
                }),
            ]);

            const trackRow = testDb.prepare('SELECT title, album_name FROM tracks WHERE id = ?').get('t1') as {
                title: string;
                album_name: string;
            };
            expect(trackRow.title).toBe('Unknown Title');
            expect(trackRow.album_name).toBe('Unknown Album');

            const artistRow = testDb.prepare('SELECT name FROM artists WHERE id = ?').get('a1') as {
                name: string;
            };
            expect(artistRow.name).toBe('Unknown Artist');
        });

        it('upserts on id conflict (ON CONFLICT DO UPDATE) without duplicating rows', async () => {
            await repo.save([makeTrack({ title: 'Original' })]);
            await repo.save([makeTrack({ title: 'Updated', durationMs: 999 })]);

            const count = (
                testDb.prepare('SELECT COUNT(*) as c FROM tracks WHERE id = ?').get('t1') as { c: number }
            ).c;
            expect(count).toBe(1);

            const row = testDb.prepare('SELECT title, duration_ms FROM tracks WHERE id = ?').get('t1') as {
                title: string;
                duration_ms: number;
            };
            expect(row.title).toBe('Updated');
            expect(row.duration_ms).toBe(999);
        });

        it('replaces track-artist links on re-save (no orphaned links)', async () => {
            await repo.save([makeTrack({ artists: [{ id: 'a1', name: 'First' }] })]);
            await repo.save([makeTrack({ artists: [{ id: 'a2', name: 'Second' }] })]);

            const links = testDb
                .prepare('SELECT artist_id FROM track_artists WHERE track_id = ?')
                .all('t1') as { artist_id: string }[];
            expect(links.map((l) => l.artist_id)).toEqual(['a2']);
        });

        it('skips artists without an id', async () => {
            await repo.save([
                makeTrack({
                    artists: [
                        { id: '', name: 'No Id' },
                        { id: 'a1', name: 'Has Id' },
                    ],
                }),
            ]);

            const artists = testDb.prepare('SELECT id FROM artists').all() as { id: string }[];
            expect(artists.map((a) => a.id)).toEqual(['a1']);
        });

        it('handles a track with no artists array', async () => {
            await repo.save([makeTrack({ artists: [] })]);

            const links = testDb.prepare('SELECT * FROM track_artists WHERE track_id = ?').all('t1');
            expect(links).toHaveLength(0);
            const track = await repo.findById('t1');
            expect(track!.artists).toEqual([]);
        });

        it('persists multiple tracks in a single call', async () => {
            await repo.save([
                makeTrack({ id: 't1' }),
                makeTrack({ id: 't2', title: 'Second' }),
            ]);
            expect(await repo.count()).toBe(2);
        });
    });

    describe('findById', () => {
        it('returns null when the track does not exist', async () => {
            expect(await repo.findById('missing')).toBeNull();
        });

        it('hydrates a full track with artists and genres', async () => {
            await repo.save([makeTrack()]);

            const track = await repo.findById('t1');
            expect(track).not.toBeNull();
            expect(track!.id).toBe('t1');
            expect(track!.title).toBe('Test Song');
            expect(track!.album.releaseYear).toBe(2010);
            expect(track!.album.imageUrl).toBe('https://img.mock.test/alb1.jpg');
            expect(track!.artists).toHaveLength(1);
            expect(track!.artists[0].name).toBe('The Mock Band');
            expect(track!.artists[0].genres).toEqual(['rock']);
        });
    });

    describe('findAll', () => {
        it('returns an empty array when there are no tracks', async () => {
            expect(await repo.findAll()).toEqual([]);
        });

        it('returns tracks ordered by added_at descending', async () => {
            await repo.save([
                makeTrack({ id: 'old', addedAt: '2020-01-01T00:00:00.000Z' }),
                makeTrack({ id: 'new', addedAt: '2024-01-01T00:00:00.000Z' }),
            ]);

            const all = await repo.findAll();
            expect(all.map((t) => t.id)).toEqual(['new', 'old']);
        });
    });

    describe('count', () => {
        it('returns 0 for an empty repository', async () => {
            expect(await repo.count()).toBe(0);
        });

        it('counts persisted tracks', async () => {
            await repo.save([makeTrack({ id: 't1' }), makeTrack({ id: 't2' })]);
            expect(await repo.count()).toBe(2);
        });
    });

    describe('findPaginated', () => {
        beforeEach(async () => {
            await repo.save([
                makeTrack({ id: 't1', title: 'Alpha', addedAt: '2024-01-01T00:00:00.000Z' }),
                makeTrack({ id: 't2', title: 'Bravo', addedAt: '2024-01-02T00:00:00.000Z' }),
                makeTrack({ id: 't3', title: 'Charlie', addedAt: '2024-01-03T00:00:00.000Z' }),
            ]);
            rebuildFts();
        });

        it('uses defaults (page 1, limit 50) and reports totals', async () => {
            const result = await repo.findPaginated();
            expect(result.total).toBe(3);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(50);
            expect(result.totalPages).toBe(1);
            expect(result.data).toHaveLength(3);
        });

        it('slices by page and limit and computes totalPages', async () => {
            const page1 = await repo.findPaginated({ page: 1, limit: 2 });
            expect(page1.data).toHaveLength(2);
            expect(page1.totalPages).toBe(2);

            const page2 = await repo.findPaginated({ page: 2, limit: 2 });
            expect(page2.data).toHaveLength(1);
            expect(page2.total).toBe(3);
        });

        it('sorts by title ascending', async () => {
            const result = await repo.findPaginated({ sortBy: 'title', sortOrder: 'asc' });
            expect(result.data.map((t) => t.title)).toEqual(['Alpha', 'Bravo', 'Charlie']);
        });

        it('sorts by title descending', async () => {
            const result = await repo.findPaginated({ sortBy: 'title', sortOrder: 'desc' });
            expect(result.data.map((t) => t.title)).toEqual(['Charlie', 'Bravo', 'Alpha']);
        });

        it('defaults added_at sort to descending', async () => {
            const result = await repo.findPaginated({ sortBy: 'added_at' });
            expect(result.data.map((t) => t.id)).toEqual(['t3', 't2', 't1']);
        });

        it('filters by year', async () => {
            await repo.save([
                makeTrack({
                    id: 't90s',
                    album: { id: 'a', name: 'Old', releaseDate: '1999-01-01', releaseYear: 1999 },
                }),
            ]);
            const result = await repo.findPaginated({ year: 1999 });
            expect(result.total).toBe(1);
            expect(result.data[0].id).toBe('t90s');
        });

        it('filters by genre', async () => {
            await repo.save([
                makeTrack({
                    id: 'jazz1',
                    artists: [{ id: 'aj', name: 'Jazz Artist', genres: ['jazz'] }],
                }),
            ]);
            const result = await repo.findPaginated({ genre: 'jazz' });
            expect(result.total).toBe(1);
            expect(result.data[0].id).toBe('jazz1');
        });

        it('filters by full-text query', async () => {
            const result = await repo.findPaginated({ query: 'Alpha' });
            expect(result.total).toBe(1);
            expect(result.data[0].title).toBe('Alpha');
        });

        it('returns empty data for a page beyond the result set', async () => {
            const result = await repo.findPaginated({ page: 99, limit: 2 });
            expect(result.data).toHaveLength(0);
            expect(result.total).toBe(3);
        });
    });

    describe('search', () => {
        beforeEach(async () => {
            await repo.save([
                makeTrack({ id: 't1', title: 'Hello World' }),
                makeTrack({ id: 't2', title: 'Goodbye Moon' }),
            ]);
            rebuildFts();
        });

        it('matches tracks by FTS prefix', async () => {
            const results = await repo.search('Hello');
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('t1');
        });

        it('returns empty when nothing matches', async () => {
            const results = await repo.search('Nonexistent');
            expect(results).toHaveLength(0);
        });
    });

    describe('findByGenre', () => {
        it('returns distinct tracks tagged with the genre', async () => {
            await repo.save([
                makeTrack({ id: 't1', artists: [{ id: 'a1', name: 'A', genres: ['rock'] }] }),
                makeTrack({ id: 't2', artists: [{ id: 'a2', name: 'B', genres: ['pop'] }] }),
            ]);

            const rock = await repo.findByGenre('rock');
            expect(rock.map((t) => t.id)).toEqual(['t1']);
        });

        it('returns empty for an unknown genre', async () => {
            await repo.save([makeTrack()]);
            expect(await repo.findByGenre('reggaeton')).toEqual([]);
        });
    });

    describe('getGenres', () => {
        it('aggregates distinct track counts per genre ordered by count', async () => {
            await repo.save([
                makeTrack({ id: 't1', artists: [{ id: 'a1', name: 'A', genres: ['rock', 'pop'] }] }),
                makeTrack({ id: 't2', artists: [{ id: 'a2', name: 'B', genres: ['rock'] }] }),
            ]);

            const genres = await repo.getGenres();
            expect(genres[0]).toEqual({ genre: 'rock', count: 2 });
            const pop = genres.find((g) => g.genre === 'pop');
            expect(pop!.count).toBe(1);
        });

        it('returns empty when there are no genres', async () => {
            expect(await repo.getGenres()).toEqual([]);
        });
    });

    describe('getYears', () => {
        it('aggregates counts per release year, newest first, skipping nulls', async () => {
            await repo.save([
                makeTrack({
                    id: 't1',
                    album: { id: 'a', name: 'X', releaseDate: '2010-01-01', releaseYear: 2010 },
                }),
                makeTrack({
                    id: 't2',
                    album: { id: 'b', name: 'Y', releaseDate: '2020-01-01', releaseYear: 2020 },
                }),
                makeTrack({
                    id: 't3',
                    album: { id: 'c', name: 'Z', releaseDate: '2020-06-01', releaseYear: 2020 },
                }),
                makeTrack({
                    id: 't4',
                    album: { id: 'd', name: 'W', releaseDate: '', releaseYear: undefined },
                }),
            ]);

            const years = await repo.getYears();
            expect(years).toEqual([
                { year: 2020, count: 2 },
                { year: 2010, count: 1 },
            ]);
        });
    });
});
