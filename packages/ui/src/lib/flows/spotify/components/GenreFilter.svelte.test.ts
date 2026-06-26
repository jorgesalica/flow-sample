import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GenreCount } from '@flows/shared';

const loadTracks = vi.fn();
const genresGet = vi.fn();

vi.mock('../api', () => ({ loadTracks: (...args: unknown[]) => loadTracks(...args) }));
vi.mock('@lib/client', () => ({
  api: { api: { spotify: { genres: { get: () => genresGet() } } } },
}));

import GenreFilter from './GenreFilter.svelte';
import { searchOptions } from '../stores';

const GENRES: GenreCount[] = [
  { genre: 'rock', count: 12 },
  { genre: 'pop', count: 5 },
];

describe('GenreFilter', () => {
  beforeEach(() => {
    searchOptions.set({ page: 1, limit: 24, q: '', sortBy: 'added_at', sortOrder: 'desc' });
    loadTracks.mockClear();
    genresGet.mockReset();
  });

  it('always renders the "All Genres" default option', async () => {
    genresGet.mockResolvedValue({ data: [], error: null });
    render(GenreFilter);

    expect(screen.getByRole('option', { name: 'All Genres' })).toBeInTheDocument();
  });

  it('populates options from the fetched genres with their counts', async () => {
    genresGet.mockResolvedValue({ data: GENRES, error: null });
    render(GenreFilter);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'rock (12)' })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'pop (5)' })).toBeInTheDocument();
  });

  it('does not add genre options when the fetch returns an error', async () => {
    genresGet.mockResolvedValue({ data: null, error: { status: 500 } });
    render(GenreFilter);

    // Give the onMount promise a chance to settle.
    await Promise.resolve();
    expect(screen.queryByRole('option', { name: /rock/ })).not.toBeInTheDocument();
    // Only the default remains.
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('loads tracks filtered by the selected genre on page 1', async () => {
    genresGet.mockResolvedValue({ data: GENRES, error: null });
    render(GenreFilter);

    // Wait for the async-loaded option to exist before selecting it.
    await screen.findByRole('option', { name: 'rock (12)' });
    const select = screen.getByRole('combobox');
    await fireEvent.change(select, { target: { value: 'rock' } });

    expect(loadTracks).toHaveBeenCalledWith({ genre: 'rock', page: 1 });
  });

  it('passes undefined genre (clear) when the default option is chosen', async () => {
    genresGet.mockResolvedValue({ data: GENRES, error: null });
    render(GenreFilter);

    const select = await screen.findByRole('combobox');
    await fireEvent.change(select, { target: { value: '' } });

    expect(loadTracks).toHaveBeenCalledWith({ genre: undefined, page: 1 });
  });
});
