import { createDatabase } from '@flows/core';
import type Database from 'better-sqlite3';

export function createBoardDatabase(dataDir?: string): Database.Database {
  return createDatabase('boards.db', dataDir);
}
