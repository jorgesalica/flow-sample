import { describe, it, expect, vi } from 'vitest';
import { FlowEngine } from '../../src/spotify-flow/core/engine';
import { SourcePort, StoragePort } from '../../src/spotify-flow/core/ports';
import { Track } from '../../src/spotify-flow/core/types';

const mockTrack: Track = {
    id: '1',
    title: 'Test Song',
    artists: [{ id: 'a1', name: 'Test Artist' }],
    album: { id: 'al1', name: 'Test Album', releaseDate: '2023-01-01', releaseYear: 2023 },
    addedAt: '2023-06-15T10:00:00Z',
    durationMs: 180000,
    popularity: 50,
};

describe('FlowEngine', () => {
    it('fetches tracks and saves them', async () => {
        const mockSource: SourcePort = {
            fetchTracks: vi.fn().mockResolvedValue([mockTrack]),
        };

        const mockStorage: StoragePort = {
            saveTracks: vi.fn().mockResolvedValue(undefined),
            loadTracks: vi.fn().mockResolvedValue(null),
        };

        const engine = new FlowEngine(mockSource, mockStorage);
        await engine.run({ limit: 1 });

        expect(mockSource.fetchTracks).toHaveBeenCalledWith(1);
        expect(mockStorage.saveTracks).toHaveBeenCalledWith([mockTrack]);
    });

    it('handles empty track list', async () => {
        const mockSource: SourcePort = {
            fetchTracks: vi.fn().mockResolvedValue([]),
        };

        const mockStorage: StoragePort = {
            saveTracks: vi.fn().mockResolvedValue(undefined),
            loadTracks: vi.fn().mockResolvedValue(null),
        };

        const engine = new FlowEngine(mockSource, mockStorage);
        await engine.run({ limit: 1 });

        expect(mockStorage.saveTracks).toHaveBeenCalledWith([]);
    });
});
