import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import type { TopStats } from '@lib/types';
import SpotifyHeader from './SpotifyHeader.svelte';

function makeStats(overrides: Partial<TopStats> = {}): TopStats {
  return {
    total: 0,
    artists: 0,
    topGenre: '—',
    genres: [],
    decadeDistribution: {},
    ...overrides,
  };
}

describe('SpotifyHeader', () => {
  it('renders the title and a back-to-flows link', () => {
    render(SpotifyHeader, { props: { stats: makeStats() } });

    expect(screen.getByRole('heading', { name: 'Spotify Flow' })).toBeInTheDocument();
    const back = screen.getByRole('link', { name: /back to flows/i });
    expect(back).toHaveAttribute('href', '/');
  });

  it('shows the total track count and top genre from stats', () => {
    render(SpotifyHeader, { props: { stats: makeStats({ total: 142, topGenre: 'indie rock' }) } });

    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('indie rock')).toBeInTheDocument();
    expect(screen.getByText('Tracks')).toBeInTheDocument();
    expect(screen.getByText('Top Genre')).toBeInTheDocument();
  });

  it('renders the placeholder top genre when none is set', () => {
    render(SpotifyHeader, { props: { stats: makeStats({ total: 0, topGenre: '—' }) } });

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
