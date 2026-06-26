import { render, screen } from '@testing-library/svelte';
import { fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { makeTrack } from '../test-fixtures';
import TrackCard from './TrackCard.svelte';

// TrackCard pulls in LyricsModal, whose api module touches the Eden client.
// Mock the edge so nothing reaches the network when the module graph loads.
vi.mock('@lib/client', () => ({
  api: {},
}));

// Mock the lyrics api so opening the modal resolves deterministically
// instead of hitting fetch (jsdom has no network).
vi.mock('@lib/flows/lyrics/api', () => ({
  getLyrics: vi.fn().mockResolvedValue({ plainLyrics: null, status: 'not_found' }),
  interpretLyrics: vi.fn().mockResolvedValue(undefined),
}));

describe('TrackCard', () => {
  it('renders the title, joined artists and album name', () => {
    render(TrackCard, {
      props: {
        track: makeTrack({
          title: 'Get Lucky',
          artists: [
            { id: 'a1', name: 'Daft Punk' },
            { id: 'a2', name: 'Pharrell Williams' },
          ],
          album: { id: 'al1', name: 'Random Access Memories', releaseDate: '2013-05-17' },
        }),
      },
    });

    expect(screen.getByRole('heading', { name: 'Get Lucky' })).toBeInTheDocument();
    expect(screen.getByText('Daft Punk, Pharrell Williams')).toBeInTheDocument();
    expect(screen.getByText(/Random Access Memories/)).toBeInTheDocument();
  });

  it('shows the album release year when present', () => {
    render(TrackCard, {
      props: {
        track: makeTrack({
          album: { id: 'al1', name: 'Album', releaseDate: '1999-01-01', releaseYear: 1999 },
        }),
      },
    });

    expect(screen.getByText(/1999/)).toBeInTheDocument();
  });

  it('renders the album art when an image url is set', () => {
    render(TrackCard, {
      props: {
        track: makeTrack({
          album: {
            id: 'al1',
            name: 'Album',
            releaseDate: '2020-01-01',
            imageUrl: 'https://example.test/art.jpg',
          },
        }),
      },
    });

    expect(screen.getByRole('img', { name: 'Album cover' })).toBeInTheDocument();
  });

  it('omits album art when no image url is provided', () => {
    render(TrackCard, {
      props: {
        track: makeTrack({
          album: { id: 'al1', name: 'No Art Album', releaseDate: '2020-01-01' },
        }),
      },
    });

    expect(screen.queryByRole('img', { name: 'No Art Album cover' })).not.toBeInTheDocument();
  });

  it('falls back to an initial when the main artist has no avatar image', () => {
    render(TrackCard, {
      props: {
        track: makeTrack({ artists: [{ id: 'a1', name: 'Zebra' }] }),
      },
    });

    // The avatar fallback shows the first letter of the artist name.
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('renders the main artist avatar image when present', () => {
    render(TrackCard, {
      props: {
        track: makeTrack({
          artists: [{ id: 'a1', name: 'Avatared', imageUrl: 'https://example.test/a.jpg' }],
        }),
      },
    });

    expect(screen.getByRole('img', { name: 'Avatared' })).toBeInTheDocument();
  });

  it('renders the artist genres as badges', () => {
    render(TrackCard, {
      props: {
        track: makeTrack({
          artists: [{ id: 'a1', name: 'Artist', genres: ['synthpop', 'electronic'] }],
        }),
      },
    });

    expect(screen.getByText('synthpop')).toBeInTheDocument();
    expect(screen.getByText('electronic')).toBeInTheDocument();
  });

  it('does not show the lyrics modal until the Lyrics button is clicked', async () => {
    render(TrackCard, { props: { track: makeTrack() } });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Lyrics' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
