import { describe, it, expect, vi } from 'vitest';
import { SpotifyUseCase, SpotifySourcePort, ArtistDetails } from '../../../src/application/spotify.usecase';
import { TrackRepository, Track } from '../../../src/domain/flows/spotify';

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
    const mockSource: SpotifySourcePort = {
      fetchTracks: vi.fn().mockResolvedValue([mockTrack]),
      fetchArtistDetails: vi.fn().mockResolvedValue(new Map<string, ArtistDetails>([['a1', { genres: ['rock'], imageUrl: 'http://example.com/img.jpg' }]])),
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
    expect(mockRepository.save).toHaveBeenCalled();
    expect(result.count).toBe(1);
  });

  it('handles empty track list', async () => {
    const mockSource: SpotifySourcePort = {
      fetchTracks: vi.fn().mockResolvedValue([]),
      fetchArtistDetails: vi.fn().mockResolvedValue(new Map<string, ArtistDetails>()),
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
    const mockSource: SpotifySourcePort = {
      fetchTracks: vi.fn(),
      fetchArtistDetails: vi.fn(),
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

  it('enriches tracks with genres when enabled', async () => {
    const detailsMap = new Map<string, ArtistDetails>([['a1', { genres: ['rock', 'alternative'], imageUrl: 'http://example.com/img.jpg' }]]);
    const mockSource: SpotifySourcePort = {
      fetchTracks: vi.fn().mockResolvedValue([mockTrack]),
      fetchArtistDetails: vi.fn().mockResolvedValue(detailsMap),
    };

    const mockRepository: TrackRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn(),
      findById: vi.fn(),
      count: vi.fn(),
    };

    const useCase = new SpotifyUseCase(mockSource, mockRepository);
    await useCase.fetchAndSave({ limit: 1, enrichGenres: true });

    expect(mockSource.fetchArtistDetails).toHaveBeenCalledWith(['a1']);
  });

  it('skips genre enrichment when disabled', async () => {
    const mockSource: SpotifySourcePort = {
      fetchTracks: vi.fn().mockResolvedValue([mockTrack]),
      fetchArtistDetails: vi.fn(),
    };

    const mockRepository: TrackRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn(),
      findById: vi.fn(),
      count: vi.fn(),
    };

    const useCase = new SpotifyUseCase(mockSource, mockRepository);
    await useCase.fetchAndSave({ limit: 1, enrichGenres: false });

    expect(mockSource.fetchArtistDetails).not.toHaveBeenCalled();
  });

  it('propagates fetch errors', async () => {
    const mockSource: SpotifySourcePort = {
      fetchTracks: vi.fn().mockRejectedValue(new Error('API Error')),
      fetchArtistDetails: vi.fn(),
    };

    const mockRepository: TrackRepository = {
      save: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      count: vi.fn(),
    };

    const useCase = new SpotifyUseCase(mockSource, mockRepository);

    await expect(useCase.fetchAndSave({ limit: 1 })).rejects.toThrow('API Error');
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('returns count from repository', async () => {
    const mockSource: SpotifySourcePort = {
      fetchTracks: vi.fn(),
      fetchArtistDetails: vi.fn(),
    };

    const mockRepository: TrackRepository = {
      save: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      count: vi.fn().mockResolvedValue(42),
    };

    const useCase = new SpotifyUseCase(mockSource, mockRepository);
    const count = await useCase.getTrackCount();

    expect(count).toBe(42);
    expect(mockRepository.count).toHaveBeenCalled();
  });
});

