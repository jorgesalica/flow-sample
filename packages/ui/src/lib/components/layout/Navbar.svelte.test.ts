import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Navbar from './Navbar.svelte';

describe('Navbar', () => {
  it('renders the branded primary navigation', () => {
    render(Navbar, { props: { currentPath: '/' } });

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByText('Cosmic Flow')).toBeInTheDocument();
    expect(within(navigation).getByRole('img', { name: 'Cosmic Flow logo' })).toHaveAttribute(
      'src',
      '/favicon.png'
    );
  });

  it('links the brand home and exposes every top-level flow', () => {
    render(Navbar, { props: { currentPath: '/' } });

    const expectedLinks = [
      ['Cosmic Flow home', '/'],
      ['Spotify', '/spotify'],
      ['Lyrics', '/lyrics'],
      ['Canvas', '/canvas'],
      ['Trading', '/trading'],
      ['Chat', '/chat'],
    ] as const;

    expect(screen.getAllByRole('link')).toHaveLength(expectedLinks.length);
    for (const [name, href] of expectedLinks) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('marks the current flow without marking sibling links', () => {
    render(Navbar, { props: { currentPath: '/lyrics/track-1' } });

    expect(screen.getByRole('link', { name: 'Lyrics' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Spotify' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Cosmic Flow home' })).not.toHaveAttribute(
      'aria-current'
    );
  });
});
