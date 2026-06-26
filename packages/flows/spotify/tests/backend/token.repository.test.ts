import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

// In-memory DB injected via the mocked './database' module.
const testDb = new Database(':memory:');
testDb.exec(`
  CREATE TABLE IF NOT EXISTS token_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

vi.mock('../../src/backend/database', () => ({ musicDb: testDb }));

const { SQLiteTokenRepository } = await import('../../src/backend/token.repository');

const FIXED_NOW = 1_700_000_000_000;
const KEY = 'spotify:access_token';

describe('SQLiteTokenRepository', () => {
    let repo: InstanceType<typeof SQLiteTokenRepository>;

    beforeEach(() => {
        testDb.exec('DELETE FROM token_cache');
        repo = new SQLiteTokenRepository();
        vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('get', () => {
        it('returns null when the key is absent', () => {
            expect(repo.get('missing')).toBeNull();
        });

        it('returns the stored value when not expired', () => {
            repo.set(KEY, 'token-abc', FIXED_NOW + 60_000);
            expect(repo.get(KEY)).toBe('token-abc');
        });

        it('returns null and evicts the row when expired', () => {
            repo.set(KEY, 'token-expired', FIXED_NOW - 1);

            expect(repo.get(KEY)).toBeNull();

            const row = testDb.prepare('SELECT * FROM token_cache WHERE key = ?').get(KEY);
            expect(row).toBeUndefined();
        });

        it('treats an exactly-now expiry as not-yet-expired (boundary)', () => {
            // get() evicts only when Date.now() > expires_at; equality is still valid.
            repo.set(KEY, 'token-boundary', FIXED_NOW);
            expect(repo.get(KEY)).toBe('token-boundary');
        });
    });

    describe('set', () => {
        it('inserts a new token row', () => {
            repo.set(KEY, 'token-new', FIXED_NOW + 1000);

            const row = testDb.prepare('SELECT * FROM token_cache WHERE key = ?').get(KEY) as {
                value: string;
                expires_at: number;
            };
            expect(row.value).toBe('token-new');
            expect(row.expires_at).toBe(FIXED_NOW + 1000);
        });

        it('replaces an existing token for the same key (INSERT OR REPLACE)', () => {
            repo.set(KEY, 'old', FIXED_NOW + 1000);
            repo.set(KEY, 'new', FIXED_NOW + 2000);

            const count = (
                testDb.prepare('SELECT COUNT(*) as c FROM token_cache WHERE key = ?').get(KEY) as { c: number }
            ).c;
            expect(count).toBe(1);
            expect(repo.get(KEY)).toBe('new');
        });
    });
});
