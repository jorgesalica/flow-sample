import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import AlbumArt from './AlbumArt.svelte';

describe('AlbumArt', () => {
  it('renders the cover image with an accessible alt derived from the album name', () => {
    render(AlbumArt, {
      props: {
        imageUrl: 'https://example.test/cover.jpg',
        albumName: 'Random Access Memories',
        durationMs: 245000,
      },
    });

    const img = screen.getByRole('img', { name: 'Random Access Memories cover' });
    expect(img).toHaveAttribute('src', 'https://example.test/cover.jpg');
  });

  it('formats the duration as m:ss with zero-padded seconds', () => {
    // 245000ms = 4:05
    render(AlbumArt, {
      props: {
        imageUrl: 'https://example.test/cover.jpg',
        albumName: 'Album',
        durationMs: 245000,
      },
    });

    expect(screen.getByText('4:05')).toBeInTheDocument();
  });

  it('rounds the seconds component the same way the component does', () => {
    // 200000ms -> 3 min + 20s exactly = 3:20
    render(AlbumArt, {
      props: { imageUrl: 'x', albumName: 'A', durationMs: 200000 },
    });

    expect(screen.getByText('3:20')).toBeInTheDocument();
  });

  it('renders an external Spotify link when a spotifyUrl is provided', () => {
    render(AlbumArt, {
      props: {
        imageUrl: 'x',
        albumName: 'A',
        durationMs: 60000,
        spotifyUrl: 'https://open.spotify.com/track/abc',
      },
    });

    const link = screen.getByRole('link', { name: /open in spotify/i });
    expect(link).toHaveAttribute('href', 'https://open.spotify.com/track/abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits the Spotify link when no spotifyUrl is provided', () => {
    render(AlbumArt, {
      props: { imageUrl: 'x', albumName: 'A', durationMs: 60000 },
    });

    expect(screen.queryByRole('link', { name: /open in spotify/i })).not.toBeInTheDocument();
  });
});
