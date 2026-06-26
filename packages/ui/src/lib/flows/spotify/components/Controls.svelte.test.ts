import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const loadTracks = vi.fn();
const fetchFromSpotify = vi.fn();
const cancelSync = vi.fn();

vi.mock('../api', () => ({
  loadTracks: (...args: unknown[]) => loadTracks(...args),
  fetchFromSpotify: (...args: unknown[]) => fetchFromSpotify(...args),
  cancelSync: (...args: unknown[]) => cancelSync(...args),
}));
vi.mock('@lib/client', () => ({ api: {} }));

import Controls from './Controls.svelte';
import { spotifyStore } from '../stores.svelte';

describe('Controls', () => {
  beforeEach(() => {
    loadTracks.mockClear();
    fetchFromSpotify.mockClear();
    cancelSync.mockClear();
    spotifyStore.isLoading = false;
    spotifyStore.isAuthenticated = false;
  });

  it('shows a Connect Spotify link when unauthenticated', () => {
    spotifyStore.isAuthenticated = false;
    render(Controls);

    const link = screen.getByRole('link', { name: /connect spotify/i });
    expect(link).toHaveAttribute('href', '/api/spotify/auth/login');
    expect(screen.queryByRole('button', { name: /sync with spotify/i })).not.toBeInTheDocument();
  });

  it('shows a Sync with Spotify button when authenticated', () => {
    spotifyStore.isAuthenticated = true;
    render(Controls);

    expect(screen.getByRole('button', { name: /sync with spotify/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /connect spotify/i })).not.toBeInTheDocument();
  });

  it('refreshes the first page when Refresh is clicked', async () => {
    render(Controls);

    await fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(loadTracks).toHaveBeenCalledWith({ page: 1 });
  });

  it('disables Refresh while loading', () => {
    spotifyStore.isLoading = true;
    render(Controls);

    expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
  });

  it('triggers a sync when authenticated and not loading', async () => {
    spotifyStore.isAuthenticated = true;
    spotifyStore.isLoading = false;
    render(Controls);

    await fireEvent.click(screen.getByRole('button', { name: /sync with spotify/i }));

    expect(fetchFromSpotify).toHaveBeenCalledOnce();
    expect(cancelSync).not.toHaveBeenCalled();
  });

  it('cancels the sync when authenticated and already loading', async () => {
    spotifyStore.isAuthenticated = true;
    spotifyStore.isLoading = true;
    render(Controls);

    await fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(cancelSync).toHaveBeenCalledOnce();
    expect(fetchFromSpotify).not.toHaveBeenCalled();
  });
});
