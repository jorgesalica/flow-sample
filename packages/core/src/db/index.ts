import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Create a SQLite database instance with standard configuration.
 *
 * @param dbName - Name of the database file (e.g., 'music.db', 'trading.db')
 * @param dataDir - Optional custom directory. Defaults to `data/` relative to cwd.
 * @returns Configured better-sqlite3 Database instance
 */
export function createDatabase(dbName: string, dataDir?: string): Database.Database {
  const dir = dataDir || path.resolve(process.cwd(), 'data');

  // Ensure data directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const dbPath = path.join(dir, dbName);
  const db = new Database(dbPath);

  // Performance settings
  db.pragma('journal_mode = WAL');

  return db;
}

export { Database };
