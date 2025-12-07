import { db } from '../persistence/sqlite/database';
import { logger } from '../logger';

const log = logger.child({ module: 'SQLiteTokenRepository' });

export class SQLiteTokenRepository {
  /**
   * Get a token value by key (e.g. 'spotify:refresh_token')
   */
  get(key: string): string | null {
    try {
      const row = db.prepare('SELECT value FROM token_cache WHERE key = ?').get(key) as
        | { value: string }
        | undefined;

      return row?.value ?? null;
    } catch (error) {
      log.error({ key, error }, 'Failed to get token');
      return null;
    }
  }

  /**
   * Set a token value with expiration
   */
  set(key: string, value: string, expiresAt: number): void {
    try {
      db.prepare(
        `INSERT INTO token_cache (key, value, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           expires_at = excluded.expires_at`,
      ).run(key, value, expiresAt);
    } catch (error) {
      log.error({ key, error }, 'Failed to set token');
    }
  }

  /**
   * Delete a token
   */
  delete(key: string): void {
    try {
      db.prepare('DELETE FROM token_cache WHERE key = ?').run(key);
    } catch (error) {
      log.error({ key, error }, 'Failed to delete token');
    }
  }
}
