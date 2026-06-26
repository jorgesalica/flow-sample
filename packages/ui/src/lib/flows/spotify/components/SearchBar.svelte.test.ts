import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const loadTracks = vi.fn();

// Mock the flow api edge — SearchBar drives search through loadTracks.
vi.mock('../api', () => ({ loadTracks: (...args: unknown[]) => loadTracks(...args) }));
vi.mock('@lib/client', () => ({ api: {} }));

import SearchBar from './SearchBar.svelte';
import { spotifyStore } from '../stores.svelte';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    spotifyStore.searchOptions = {
      page: 1,
      limit: 24,
      q: '',
      sortBy: 'added_at',
      sortOrder: 'desc',
    };
    loadTracks.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders the search input with a placeholder', () => {
    render(SearchBar);
    expect(screen.getByPlaceholderText('Search tracks, artists, albums...')).toBeInTheDocument();
  });

  it('debounces input and loads tracks with the typed query on page 1', async () => {
    render(SearchBar);
    const input = screen.getByPlaceholderText<HTMLInputElement>(
      'Search tracks, artists, albums...'
    );

    await fireEvent.input(input, { target: { value: 'daft' } });
    // Debounced — nothing fires immediately.
    expect(loadTracks).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(loadTracks).toHaveBeenCalledWith({ q: 'daft', page: 1 });
  });

  it('shows a clear button only once there is a value', async () => {
    render(SearchBar);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText('Search tracks, artists, albums...');
    await fireEvent.input(input, { target: { value: 'x' } });

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('clears the query and reloads when the clear button is clicked', async () => {
    render(SearchBar);
    const input = screen.getByPlaceholderText<HTMLInputElement>(
      'Search tracks, artists, albums...'
    );
    await fireEvent.input(input, { target: { value: 'jazz' } });

    await fireEvent.click(screen.getByRole('button'));

    expect(input.value).toBe('');
    expect(loadTracks).toHaveBeenCalledWith({ q: '', page: 1 });
  });
});
