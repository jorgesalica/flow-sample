import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GenreCount, YearCount } from '@flows/shared';

const loadTracks = vi.fn();
vi.mock('../api', () => ({ loadTracks: (...args: unknown[]) => loadTracks(...args) }));

import FilterPanel from './FilterPanel.svelte';
import { spotifyStore } from '../stores.svelte';

const GENRES: GenreCount[] = [{ genre: 'rock', count: 12 }];
const YEARS: YearCount[] = [{ year: 2021, count: 8 }];

const renderPanel = () => render(FilterPanel, { props: { genres: GENRES, years: YEARS } });

describe('FilterPanel', () => {
  beforeEach(() => {
    spotifyStore.searchOptions = {
      page: 1,
      limit: 24,
      q: '',
      sortBy: 'added_at',
      sortOrder: 'desc',
    };
    loadTracks.mockClear();
  });

  it('renders the Filters toggle button collapsed by default', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    // Panel is closed: the Apply Filters button is not present yet.
    expect(screen.queryByRole('button', { name: /apply filters/i })).not.toBeInTheDocument();
  });

  it('opens the panel and shows the filter controls when toggled', async () => {
    renderPanel();

    await fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    expect(screen.getByLabelText('Genre')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
    expect(screen.getByLabelText('Order')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
  });

  it('populates genre and year options from the fetched data', async () => {
    renderPanel();

    await fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'rock (12)' })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: '2021 (8)' })).toBeInTheDocument();
  });

  it('applies selected filters and closes the panel', async () => {
    renderPanel();

    await fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    await waitFor(() => screen.getByRole('option', { name: 'rock (12)' }));

    await fireEvent.change(screen.getByLabelText('Genre'), { target: { value: 'rock' } });
    await fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2021' } });
    await fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(loadTracks).toHaveBeenCalledWith({
      genre: 'rock',
      year: 2021,
      sortBy: 'added_at',
      sortOrder: 'desc',
      page: 1,
    });
    // Panel closes after applying.
    expect(screen.queryByRole('button', { name: /apply filters/i })).not.toBeInTheDocument();
  });

  it('shows an active-filter count badge once a filter is chosen', async () => {
    renderPanel();

    await fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    await waitFor(() => screen.getByRole('option', { name: 'rock (12)' }));

    await fireEvent.change(screen.getByLabelText('Genre'), { target: { value: 'rock' } });

    // Toggle button now carries a "1" badge for the single active filter.
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('clears all filters back to defaults and reloads', async () => {
    renderPanel();

    await fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    await waitFor(() => screen.getByRole('option', { name: 'rock (12)' }));

    await fireEvent.change(screen.getByLabelText('Genre'), { target: { value: 'rock' } });
    await fireEvent.click(screen.getByRole('button', { name: /clear all/i }));

    expect(loadTracks).toHaveBeenLastCalledWith({ page: 1 });
    expect(screen.getByLabelText('Genre')).toHaveValue('');
  });

  it('renders default options when the loader supplies empty lists', async () => {
    render(FilterPanel, { props: { genres: [], years: [] } });

    await fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    expect(screen.getByRole('option', { name: 'All Genres' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All Years' })).toBeInTheDocument();
  });
});
