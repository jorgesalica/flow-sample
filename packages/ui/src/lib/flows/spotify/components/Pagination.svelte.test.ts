import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const loadTracks = vi.fn();

vi.mock('../api', () => ({ loadTracks: (...args: unknown[]) => loadTracks(...args) }));
vi.mock('@lib/client', () => ({ api: {} }));

import Pagination from './Pagination.svelte';
import { spotifyStore } from '../stores.svelte';

function setState(page: number, total: number, limit = 24) {
  spotifyStore.searchOptions = { page, limit, q: '', sortBy: 'added_at', sortOrder: 'desc' };
  spotifyStore.totalTracks = total;
}

describe('Pagination', () => {
  beforeEach(() => {
    loadTracks.mockClear();
    // jsdom lacks scrollTo; the component calls it after navigation.
    window.scrollTo = vi.fn();
  });

  it('renders nothing when there is only a single page', () => {
    setState(1, 10); // 10 / 24 -> 1 page
    const { container } = render(Pagination);

    expect(container.textContent?.trim()).toBe('');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the current page and total pages when multiple pages exist', () => {
    setState(2, 100); // ceil(100/24) = 5 pages
    render(Pagination);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('disables Previous on the first page', () => {
    setState(1, 100);
    render(Pagination);

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('disables Next on the last page', () => {
    setState(5, 100); // last of 5
    render(Pagination);

    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
  });

  it('loads the next page when Next is clicked', async () => {
    setState(2, 100);
    render(Pagination);

    await fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(loadTracks).toHaveBeenCalledWith({ page: 3 });
  });

  it('loads the previous page when Previous is clicked', async () => {
    setState(3, 100);
    render(Pagination);

    await fireEvent.click(screen.getByRole('button', { name: /previous/i }));

    expect(loadTracks).toHaveBeenCalledWith({ page: 2 });
  });
});
