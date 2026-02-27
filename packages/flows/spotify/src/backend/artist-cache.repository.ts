import { musicDb } from './database';
import { logger } from '@flows/core';

const log = logger.child({ module: 'ArtistCacheRepository' });

export interface CachedArtist {
    id: string;
    genres: string[];
    imageUrl?: string;
    cachedAt: number;
}

export class ArtistCacheRepository {
    /**
     * Get multiple artists from cache. Returns a map of found entries
     * and an array of IDs that were not in the cache.
     */
    getMany(ids: string[]): { cached: Map<string, CachedArtist>; misses: string[] } {
        const cached = new Map<string, CachedArtist>();
        const misses: string[] = [];

        const stmt = musicDb.prepare(
            'SELECT id, genres, image_url, cached_at FROM artist_cache WHERE id = ?',
        );

        for (const id of ids) {
            const row = stmt.get(id) as
                | { id: string; genres: string | null; image_url: string | null; cached_at: number }
                | undefined;

            if (row) {
                cached.set(row.id, {
                    id: row.id,
                    genres: row.genres ? JSON.parse(row.genres) : [],
                    imageUrl: row.image_url ?? undefined,
                    cachedAt: row.cached_at,
                });
            } else {
                misses.push(id);
            }
        }

        log.debug({ cached: cached.size, misses: misses.length }, 'Artist cache lookup');
        return { cached, misses };
    }

    /**
     * Upsert a single artist into the cache.
     */
    set(id: string, genres: string[], imageUrl?: string): void {
        musicDb
            .prepare(
                `INSERT OR REPLACE INTO artist_cache (id, genres, image_url, cached_at)
         VALUES (?, ?, ?, ?)`,
            )
            .run(id, JSON.stringify(genres), imageUrl ?? null, Date.now());
    }
}
