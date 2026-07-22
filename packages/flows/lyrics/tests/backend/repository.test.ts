import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { SQLiteLyricsRepository } from '../../src/backend/repository';

// In-memory DB shared across the mock and tests
const testDb = new Database(':memory:');

testDb.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    added_at TEXT
  );
  CREATE TABLE IF NOT EXISTS lyrics (
    track_id TEXT PRIMARY KEY,
    plain_lyrics TEXT,
    synced_lyrics TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    fetched_at TEXT,
    interpretation TEXT
  );
`);

describe('SQLiteLyricsRepository', () => {
    let repo: InstanceType<typeof SQLiteLyricsRepository>;

    beforeEach(() => {
        testDb.exec('DELETE FROM lyrics; DELETE FROM tracks;');
        repo = new SQLiteLyricsRepository(testDb);
    });

    describe('findByTrackId', () => {
        it('returns null when track has no lyrics row', async () => {
            expect(await repo.findByTrackId('t1')).toBeNull();
        });

        it('returns the lyrics record when found', async () => {
            const now = new Date().toISOString();
            testDb
                .prepare(
                    `INSERT INTO lyrics (track_id, plain_lyrics, synced_lyrics, status, fetched_at)
                     VALUES (?, ?, ?, 'found', ?)`,
                )
                .run('t1', 'Hello world', '[00:01.00] Hello world', now);

            const record = await repo.findByTrackId('t1');
            expect(record).not.toBeNull();
            expect(record!.trackId).toBe('t1');
            expect(record!.plainLyrics).toBe('Hello world');
            expect(record!.syncedLyrics).toBe('[00:01.00] Hello world');
            expect(record!.status).toBe('found');
        });
    });

    describe('save', () => {
        it('inserts a new lyrics row with status found', async () => {
            await repo.save('t1', { plainLyrics: 'Verse 1', syncedLyrics: null });

            const row = testDb
                .prepare('SELECT * FROM lyrics WHERE track_id = ?')
                .get('t1') as { status: string; plain_lyrics: string };

            expect(row.status).toBe('found');
            expect(row.plain_lyrics).toBe('Verse 1');
        });

        it('upserts existing row on conflict', async () => {
            await repo.save('t1', { plainLyrics: 'Old text', syncedLyrics: null });
            await repo.save('t1', { plainLyrics: 'New text', syncedLyrics: '[00:00.00] New text' });

            const count = (
                testDb.prepare('SELECT COUNT(*) as c FROM lyrics WHERE track_id = ?').get('t1') as { c: number }
            ).c;
            expect(count).toBe(1);

            const record = await repo.findByTrackId('t1');
            expect(record!.plainLyrics).toBe('New text');
            expect(record!.syncedLyrics).toBe('[00:00.00] New text');
        });
    });

    describe('markNotFound', () => {
        it('sets status to not_found', async () => {
            await repo.markNotFound('t1');

            const record = await repo.findByTrackId('t1');
            expect(record!.status).toBe('not_found');
            expect(record!.plainLyrics).toBeNull();
        });

        it('upserts when row already exists', async () => {
            await repo.save('t1', { plainLyrics: 'Some text', syncedLyrics: null });
            await repo.markNotFound('t1');

            const record = await repo.findByTrackId('t1');
            expect(record!.status).toBe('not_found');
        });
    });

    describe('getPendingTrackIds', () => {
        beforeEach(() => {
            testDb
                .prepare(`INSERT INTO tracks (id, title, added_at) VALUES (?, ?, ?)`)
                .run('t1', 'Song 1', new Date().toISOString());
            testDb
                .prepare(`INSERT INTO tracks (id, title, added_at) VALUES (?, ?, ?)`)
                .run('t2', 'Song 2', new Date().toISOString());
            testDb
                .prepare(`INSERT INTO tracks (id, title, added_at) VALUES (?, ?, ?)`)
                .run('t3', 'Song 3', new Date().toISOString());
        });

        it('returns all tracks with no lyrics row', async () => {
            const ids = await repo.getPendingTrackIds();
            expect(ids).toHaveLength(3);
            expect(ids).toContain('t1');
        });

        it('excludes tracks that already have lyrics', async () => {
            await repo.save('t1', { plainLyrics: 'Text', syncedLyrics: null });

            const ids = await repo.getPendingTrackIds();
            expect(ids).not.toContain('t1');
            expect(ids).toHaveLength(2);
        });

        it('includes not_found tracks when includeFailed is true', async () => {
            await repo.markNotFound('t1');

            const defaultIds = await repo.getPendingTrackIds();
            expect(defaultIds).not.toContain('t1');

            const withFailed = await repo.getPendingTrackIds(true);
            expect(withFailed).toContain('t1');
        });
    });

    describe('getStats', () => {
        beforeEach(() => {
            testDb
                .prepare(`INSERT INTO tracks (id, title) VALUES (?, ?)`)
                .run('t1', 'Song 1');
            testDb
                .prepare(`INSERT INTO tracks (id, title) VALUES (?, ?)`)
                .run('t2', 'Song 2');
            testDb
                .prepare(`INSERT INTO tracks (id, title) VALUES (?, ?)`)
                .run('t3', 'Song 3');
        });

        it('returns correct counts', async () => {
            await repo.save('t1', { plainLyrics: 'Text', syncedLyrics: null });
            await repo.markNotFound('t2');

            const stats = await repo.getStats();
            expect(stats.total).toBe(3);
            expect(stats.found).toBe(1);
            expect(stats.notFound).toBe(1);
            expect(stats.pending).toBe(1);
        });

        it('returns all pending when no lyrics exist', async () => {
            const stats = await repo.getStats();
            expect(stats.total).toBe(3);
            expect(stats.found).toBe(0);
            expect(stats.notFound).toBe(0);
            expect(stats.pending).toBe(3);
        });
    });

    describe('getInterpretation / saveInterpretation', () => {
        it('returns null when no interpretation saved', async () => {
            await repo.save('t1', { plainLyrics: 'Text', syncedLyrics: null });
            expect(await repo.getInterpretation('t1')).toBeNull();
        });

        it('saves and retrieves interpretation', async () => {
            await repo.save('t1', { plainLyrics: 'Text', syncedLyrics: null });
            await repo.saveInterpretation('t1', 'This song is about longing.');

            const result = await repo.getInterpretation('t1');
            expect(result).toBe('This song is about longing.');
        });
    });
});
