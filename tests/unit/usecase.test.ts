import { describe, it, expect, vi } from 'vitest';
import { SpotifyUseCase } from '../../src/application/spotify.usecase';
import { SourcePort, StoragePort } from '../../src/domain/shared/ports';
import { TrackRepository, Track } from '../../src/domain/flows/spotify';

const mockTrack: Track = {
    id: '1',
    title: 'Test Song',
    artists: [{ id: 'a1', name: 'Test Artist' }],
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

describe('SpotifyUseCase', () => {
    it('fetches tracks and saves them', async () => {
        const mockSource: SourcePort = {
            fetchTracks: vi.fn().mockResolvedValue([mockTrack]),
        };

        const mockRepository: TrackRepository = {
            save: vi.fn().mockResolvedValue(undefined),
            findAll: vi.fn().mockResolvedValue([]),
            findById: vi.fn().mockResolvedValue(null),
            count: vi.fn().mockResolvedValue(0),
        };

        const useCase = new SpotifyUseCase(mockSource, mockRepository);
        const result = await useCase.fetchAndSave({ limit: 1 });

        expect(mockSource.fetchTracks).toHaveBeenCalledWith(1);
        expect(mockRepository.save).toHaveBeenCalledWith([mockTrack]);
        expect(result.count).toBe(1);
    });

    it('handles empty track list', async () => {
        const mockSource: SourcePort = {
            fetchTracks: vi.fn().mockResolvedValue([]),
        };

        const mockRepository: TrackRepository = {
            save: vi.fn().mockResolvedValue(undefined),
            findAll: vi.fn().mockResolvedValue([]),
            findById: vi.fn().mockResolvedValue(null),
            count: vi.fn().mockResolvedValue(0),
        };

        const useCase = new SpotifyUseCase(mockSource, mockRepository);
        const result = await useCase.fetchAndSave({ limit: 1 });

        expect(mockRepository.save).toHaveBeenCalledWith([]);
        expect(result.count).toBe(0);
    });

    it('returns tracks from repository', async () => {
        const mockSource: SourcePort = {
            fetchTracks: vi.fn(),
        };

        const mockRepository: TrackRepository = {
            save: vi.fn(),
            findAll: vi.fn().mockResolvedValue([mockTrack]),
            findById: vi.fn(),
            count: vi.fn().mockResolvedValue(1),
        };

        const useCase = new SpotifyUseCase(mockSource, mockRepository);
        const tracks = await useCase.getTracks();

        expect(tracks).toHaveLength(1);
        expect(tracks[0].title).toBe('Test Song');
    });
});
