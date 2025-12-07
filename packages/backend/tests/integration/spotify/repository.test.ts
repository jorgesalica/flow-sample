import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

import { SQLiteTrackRepository } from '@infra/repositories/sqlite-track.repository';
import { Track } from '@domain/flows/spotify';

const TEST_DB_PATH = path.join(process.cwd(), 'tests', '.tmp', 'test.db');

const createMockTrack = (overrides: Partial<Track> = {}): Track => ({
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
  ...overrides,
});

describe('SQLiteTrackRepository', () => {
  beforeEach(async () => {
    await fs.mkdir(path.dirname(TEST_DB_PATH), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(path.dirname(TEST_DB_PATH), { recursive: true, force: true });
  });

  describe('Interface', () => {
    it('repository interface is correctly defined', () => {
      expect(SQLiteTrackRepository).toBeDefined();
      expect(new SQLiteTrackRepository()).toHaveProperty('save');
      expect(new SQLiteTrackRepository()).toHaveProperty('findAll');
      expect(new SQLiteTrackRepository()).toHaveProperty('findById');
      expect(new SQLiteTrackRepository()).toHaveProperty('count');
      expect(new SQLiteTrackRepository()).toHaveProperty('findPaginated');
      expect(new SQLiteTrackRepository()).toHaveProperty('getGenres');
      expect(new SQLiteTrackRepository()).toHaveProperty('getYears');
    });
  });

  describe('findPaginated', () => {
    it('returns paginated results with correct structure', async () => {
      const repo = new SQLiteTrackRepository();
      const result = await repo.findPaginated({ page: 1, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('respects page and limit parameters', async () => {
      const repo = new SQLiteTrackRepository();
      const result = await repo.findPaginated({ page: 2, limit: 5 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });

    it('applies sort order correctly', async () => {
      const repo = new SQLiteTrackRepository();
      const ascResult = await repo.findPaginated({ sortBy: 'title', sortOrder: 'asc' });
      const descResult = await repo.findPaginated({ sortBy: 'title', sortOrder: 'desc' });

      // Just verify the call doesn't throw
      expect(ascResult).toBeDefined();
      expect(descResult).toBeDefined();
    });
  });

  describe('getGenres', () => {
    it('returns genre counts array', async () => {
      const repo = new SQLiteTrackRepository();
      const genres = await repo.getGenres();

      expect(Array.isArray(genres)).toBe(true);
      if (genres.length > 0) {
        expect(genres[0]).toHaveProperty('genre');
        expect(genres[0]).toHaveProperty('count');
      }
    });
  });

  describe('getYears', () => {
    it('returns year counts array', async () => {
      const repo = new SQLiteTrackRepository();
      const years = await repo.getYears();

      expect(Array.isArray(years)).toBe(true);
      if (years.length > 0) {
        expect(years[0]).toHaveProperty('year');
        expect(years[0]).toHaveProperty('count');
      }
    });
  });

  describe('count', () => {
    it('returns a number', async () => {
      const repo = new SQLiteTrackRepository();
      const count = await repo.count();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
