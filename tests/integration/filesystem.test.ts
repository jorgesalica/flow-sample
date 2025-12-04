import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { FileSystemAdapter } from '../../src/spotify-flow/adapters/filesystem';
import { Track } from '../../src/spotify-flow/core/types';

const TEST_DIR = path.join(process.cwd(), 'tests', '.tmp');

const mockTrack: Track = {
    id: '1',
    title: 'Test Song',
    artists: [{ id: 'a1', name: 'Test Artist' }],
    album: { id: 'al1', name: 'Test Album', releaseDate: '2023-01-01', releaseYear: 2023 },
    addedAt: '2023-06-15T10:00:00Z',
    durationMs: 180000,
    popularity: 50,
};

describe('FileSystemAdapter', () => {
    let adapter: FileSystemAdapter;

    beforeEach(async () => {
        adapter = new FileSystemAdapter(TEST_DIR);
        await fs.mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(TEST_DIR, { recursive: true, force: true });
    });

    it('saves tracks to file', async () => {
        await adapter.saveTracks([mockTrack]);

        const content = await fs.readFile(path.join(TEST_DIR, 'liked_songs.json'), 'utf-8');
        const tracks = JSON.parse(content);

        expect(tracks).toHaveLength(1);
        expect(tracks[0].id).toBe('1');
    });

    it('loads tracks from file', async () => {
        await fs.writeFile(
            path.join(TEST_DIR, 'liked_songs.json'),
            JSON.stringify([mockTrack]),
            'utf-8'
        );

        const tracks = await adapter.loadTracks();

        expect(tracks).toHaveLength(1);
        expect(tracks?.[0].title).toBe('Test Song');
    });

    it('returns null when file does not exist', async () => {
        const tracks = await adapter.loadTracks();
        expect(tracks).toBeNull();
    });
});
