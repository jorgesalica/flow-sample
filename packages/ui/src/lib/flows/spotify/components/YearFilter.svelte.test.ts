import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { YearCount } from '@flows/shared';

const loadTracks = vi.fn();
const yearsGet = vi.fn();

vi.mock('../api', () => ({ loadTracks: (...args: unknown[]) => loadTracks(...args) }));
vi.mock('@lib/client', () => ({
  api: { api: { spotify: { years: { get: () => yearsGet() } } } },
}));

import YearFilter from './YearFilter.svelte';
import { searchOptions } from '../stores';

const YEARS: YearCount[] = [
  { year: 2021, count: 8 },
  { year: 1999, count: 3 },
];

describe('YearFilter', () => {
  beforeEach(() => {
    searchOptions.set({ page: 1, limit: 24, q: '', sortBy: 'added_at', sortOrder: 'desc' });
    loadTracks.mockClear();
    yearsGet.mockReset();
  });

  it('always renders the "All Years" default option', async () => {
    yearsGet.mockResolvedValue({ data: [], error: null });
    render(YearFilter);

    expect(screen.getByRole('option', { name: 'All Years' })).toBeInTheDocument();
  });

  it('populates options from the fetched years with their counts', async () => {
    yearsGet.mockResolvedValue({ data: YEARS, error: null });
    render(YearFilter);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: '2021 (8)' })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: '1999 (3)' })).toBeInTheDocument();
  });

  it('parses the selected year to a number when loading tracks', async () => {
    yearsGet.mockResolvedValue({ data: YEARS, error: null });
    render(YearFilter);

    // Wait for the async-loaded option to exist before selecting it.
    await screen.findByRole('option', { name: '2021 (8)' });
    const select = screen.getByRole('combobox');
    await fireEvent.change(select, { target: { value: '2021' } });

    expect(loadTracks).toHaveBeenCalledWith({ year: 2021, page: 1 });
  });

  it('passes undefined year (clear) when the default option is chosen', async () => {
    yearsGet.mockResolvedValue({ data: YEARS, error: null });
    render(YearFilter);

    const select = await screen.findByRole('combobox');
    await fireEvent.change(select, { target: { value: '' } });

    expect(loadTracks).toHaveBeenCalledWith({ year: undefined, page: 1 });
  });
});
