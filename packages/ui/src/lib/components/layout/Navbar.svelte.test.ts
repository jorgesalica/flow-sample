import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Navbar from './Navbar.svelte';

describe('Navbar', () => {
  it('renders the brand wordmark', () => {
    render(Navbar);

    expect(screen.getByText('Cosmic Flow')).toBeInTheDocument();
  });

  it('renders the logo image with accessible alt text', () => {
    render(Navbar);

    const logo = screen.getByRole('img', { name: 'Cosmic Flow' });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/favicon.png');
  });

  it('links back to the board root', () => {
    render(Navbar);

    const links = screen.getAllByRole('link');
    // Brand link + "Flows" nav link, both pointing home.
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/');
    }
  });

  it('exposes a "Flows" navigation entry', () => {
    render(Navbar);

    expect(screen.getByRole('link', { name: 'Flows' })).toBeInTheDocument();
  });
});
