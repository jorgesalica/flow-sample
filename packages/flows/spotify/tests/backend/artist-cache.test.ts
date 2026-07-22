import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ArtistCacheRepository } from '../../src/backend/artist-cache.repository';

const testDb = new Database(':memory:');

describe('ArtistCacheRepository', () => {
  let repo: ArtistCacheRepository;

  beforeEach(() => {
    repo = new ArtistCacheRepository(testDb);
    testDb.exec('DELETE FROM artist_cache');
  });

  describe('set', () => {
    it('should insert a new artist into the cache', () => {
      repo.set('artist-1', ['rock', 'indie'], 'https://img.example.com/1.jpg');

      const row = testDb.prepare('SELECT * FROM artist_cache WHERE id = ?').get('artist-1') as {
        id: string;
        genres: string;
        image_url: string;
        cached_at: number;
      };

      expect(row).toBeDefined();
      expect(row.id).toBe('artist-1');
      expect(JSON.parse(row.genres)).toEqual(['rock', 'indie']);
      expect(row.image_url).toBe('https://img.example.com/1.jpg');
      expect(row.cached_at).toBeGreaterThan(0);
    });

    it('should upsert (overwrite) existing artist data', () => {
      repo.set('artist-1', ['rock'], 'https://img.example.com/old.jpg');
      repo.set('artist-1', ['pop', 'electronic'], 'https://img.example.com/new.jpg');

      const row = testDb.prepare('SELECT * FROM artist_cache WHERE id = ?').get('artist-1') as {
        genres: string;
        image_url: string;
      };

      expect(JSON.parse(row.genres)).toEqual(['pop', 'electronic']);
      expect(row.image_url).toBe('https://img.example.com/new.jpg');
    });

    it('should handle artist with no image', () => {
      repo.set('artist-no-img', ['jazz']);

      const row = testDb
        .prepare('SELECT * FROM artist_cache WHERE id = ?')
        .get('artist-no-img') as {
        image_url: string | null;
      };

      expect(row.image_url).toBeNull();
    });
  });

  describe('getMany', () => {
    it('should return cached entries and report misses', () => {
      repo.set('a1', ['rock'], 'https://img/a1.jpg');
      repo.set('a2', ['pop'], 'https://img/a2.jpg');

      const { cached, misses } = repo.getMany(['a1', 'a2', 'a3', 'a4']);

      expect(cached.size).toBe(2);
      expect(cached.get('a1')!.genres).toEqual(['rock']);
      expect(cached.get('a1')!.imageUrl).toBe('https://img/a1.jpg');
      expect(cached.get('a2')!.genres).toEqual(['pop']);
      expect(misses).toEqual(['a3', 'a4']);
    });

    it('should return all misses when cache is empty', () => {
      const { cached, misses } = repo.getMany(['x1', 'x2']);

      expect(cached.size).toBe(0);
      expect(misses).toEqual(['x1', 'x2']);
    });

    it('should return all cached when every ID hits', () => {
      repo.set('b1', ['classical']);
      repo.set('b2', ['blues']);

      const { cached, misses } = repo.getMany(['b1', 'b2']);

      expect(cached.size).toBe(2);
      expect(misses).toHaveLength(0);
    });

    it('should handle empty input array', () => {
      const { cached, misses } = repo.getMany([]);

      expect(cached.size).toBe(0);
      expect(misses).toHaveLength(0);
    });
  });
});
