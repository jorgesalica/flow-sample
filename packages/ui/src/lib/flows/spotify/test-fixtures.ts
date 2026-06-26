import type { Track } from '@flows/shared';

/**
 * Deterministic Track factory for tests. Override only the meaningful fields.
 * Fake data only — never real PII.
 */
export function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'track-1',
    title: 'Test Song',
    artists: [{ id: 'artist-1', name: 'Test Artist', genres: ['rock'] }],
    album: {
      id: 'album-1',
      name: 'Test Album',
      releaseDate: '2020-01-01',
      releaseYear: 2020,
      imageUrl: 'https://example.test/cover.jpg',
    },
    addedAt: '2021-06-15T00:00:00.000Z',
    durationMs: 200000,
    spotifyUrl: 'https://open.spotify.com/track/track-1',
    ...overrides,
  };
}
