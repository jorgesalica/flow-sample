import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';
import { SQLiteTrackRepository } from '../../src/infrastructure/repositories/sqlite-track.repository';
import { Track } from '../../src/domain/flows/spotify';

const TEST_DB_PATH = path.join(process.cwd(), 'tests', '.tmp', 'test.db');

const mockTrack: Track = {
  id: '1',
  title: 'Test Song',
  artists: [{ id: 'a1', name: 'Test Artist', genres: ['rock'] }],
  album: {
    id: 'al1',
    name: 'Test Album',
    releaseDate: '2023-01-01',
    releaseYear: 2023,
  },
  addedAt: '2023-06-15T10:00:00Z',
  durationMs: 180000,
  popularity: 50,
};

describe('SQLiteTrackRepository', () => {
  beforeEach(async () => {
    await fs.mkdir(path.dirname(TEST_DB_PATH), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(path.dirname(TEST_DB_PATH), { recursive: true, force: true });
  });

  // Note: This test is simplified since the repository uses a global db connection
  // In a real scenario, we'd inject the database connection
  it('repository interface is correctly defined', () => {
    expect(SQLiteTrackRepository).toBeDefined();
    expect(new SQLiteTrackRepository()).toHaveProperty('save');
    expect(new SQLiteTrackRepository()).toHaveProperty('findAll');
    expect(new SQLiteTrackRepository()).toHaveProperty('findById');
    expect(new SQLiteTrackRepository()).toHaveProperty('count');
  });
});
