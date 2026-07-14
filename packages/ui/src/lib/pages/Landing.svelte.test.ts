import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import type { FlowDefinition, FlowStats } from '@lib/flows';

const getFlows = vi.fn<() => FlowDefinition[]>();
vi.mock('@lib/flows', () => ({
  getFlows: () => getFlows(),
}));

function makeFlow(
  id: string,
  stats: FlowStats | (() => Promise<FlowStats>),
  overrides: Partial<FlowDefinition> = {}
): FlowDefinition {
  const getStats = typeof stats === 'function' ? stats : async () => stats;
  return {
    id,
    name: `${id} Flow`,
    icon: '🎵',
    description: `${id} description`,
    route: `/${id}`,
    color: 'from-green-400 to-emerald-500',
    getStats,
    ...overrides,
  };
}

const { default: Landing } = await import('./Landing.svelte');

describe('Landing board', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sets the branded page title', () => {
    getFlows.mockReturnValue([]);

    render(Landing);

    expect(document.title).toBe('Cosmic Flow - Data Exploration Hub');
  });

  it('uses the shared loading state while flow stats resolve', () => {
    getFlows.mockReturnValue([makeFlow('spotify', () => new Promise<FlowStats>(() => {}))]);

    render(Landing);

    expect(screen.getByRole('status')).toHaveTextContent('Loading flow status');
  });

  it('renders registered flows without inventing unregistered board items', async () => {
    getFlows.mockReturnValue([
      makeFlow('spotify', { count: 12, status: 'active' }, { name: 'Spotify Flow' }),
    ]);

    render(Landing);

    expect(await screen.findByRole('link', { name: 'Open Spotify Flow' })).toBeInTheDocument();
    expect(screen.queryByText('YouTube Flow')).not.toBeInTheDocument();
  });

  it('renders active and configured flows as route links', async () => {
    getFlows.mockReturnValue([
      makeFlow('spotify', { count: 5, status: 'active' }, { name: 'Spotify Flow' }),
      makeFlow('lyrics', { count: 0, status: 'configured' }, { name: 'Lyrics Flow' }),
    ]);

    render(Landing);

    expect(await screen.findByRole('link', { name: 'Open Spotify Flow' })).toHaveAttribute(
      'href',
      '/spotify'
    );
    expect(screen.getByRole('link', { name: 'Open Lyrics Flow' })).toHaveAttribute(
      'href',
      '/lyrics'
    );
  });

  it('renders disabled flows as non-interactive articles', async () => {
    getFlows.mockReturnValue([
      makeFlow(
        'trading',
        { count: 0, status: 'disabled', statusMessage: 'Coming Soon' },
        { name: 'Trading Flow' }
      ),
    ]);

    render(Landing);

    const heading = await screen.findByText('Trading Flow');
    expect(heading.closest('article')).toHaveAttribute('data-state', 'unavailable');
    expect(screen.queryByRole('link', { name: 'Open Trading Flow' })).not.toBeInTheDocument();
  });

  it('shows item counts only when they are positive', async () => {
    getFlows.mockReturnValue([
      makeFlow('spotify', { count: 42, status: 'active' }, { name: 'Spotify Flow' }),
      makeFlow('empty', { count: 0, status: 'active' }, { name: 'Empty Flow' }),
    ]);

    render(Landing);

    await screen.findByRole('link', { name: 'Open Spotify Flow' });
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getAllByText('Items')).toHaveLength(1);
  });

  it('isolates a stats failure to the affected flow card', async () => {
    getFlows.mockReturnValue([
      makeFlow('broken', () => Promise.reject(new Error('boom')), { name: 'Broken Flow' }),
    ]);

    render(Landing);

    const heading = await screen.findByText('Broken Flow');
    expect(heading.closest('article')).toHaveAttribute('data-state', 'unavailable');
    expect(screen.getByText('Error')).toHaveClass('ui-badge--danger');
  });

  it('preserves custom status messages from the registry', async () => {
    getFlows.mockReturnValue([
      makeFlow(
        'spotify',
        { count: 3, status: 'active', statusMessage: '8 genres' },
        { name: 'Spotify Flow' }
      ),
    ]);

    render(Landing);

    expect(await screen.findByText('8 genres')).toHaveClass('ui-badge--success');
  });

  it('summarizes ready and total flows in the compact header', async () => {
    getFlows.mockReturnValue([]);

    render(Landing);

    expect(screen.getByRole('heading', { name: 'Board' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('0 ready')).toBeInTheDocument();
      expect(screen.getByText('0 total')).toBeInTheDocument();
    });
  });
});
