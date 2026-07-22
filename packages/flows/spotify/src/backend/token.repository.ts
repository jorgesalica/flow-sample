import { logger } from '@flows/core';
import type Database from 'better-sqlite3';

const log = logger.child({ module: 'SQLiteTokenRepository' });

export class SQLiteTokenRepository {
  constructor(private readonly db: Database.Database) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS token_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);
  }

  get(key: string): string | null {
    const row = this.db
      .prepare('SELECT value, expires_at FROM token_cache WHERE key = ?')
      .get(key) as { value: string; expires_at: number } | undefined;

    if (!row) return null;

    if (Date.now() > row.expires_at) {
      this.db.prepare('DELETE FROM token_cache WHERE key = ?').run(key);
      return null;
    }

    return row.value;
  }

  set(key: string, value: string, expiresAt: number): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO token_cache (key, value, expires_at) VALUES (?, ?, ?)',
      )
      .run(key, value, expiresAt);
    log.debug({ key }, 'Cached token');
  }
}
