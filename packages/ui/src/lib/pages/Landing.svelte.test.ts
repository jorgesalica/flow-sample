import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import type { FlowDefinition, FlowStats } from '@lib/flows';

// Mock the board manifest edge: control exactly which flows exist and what
// stats they resolve to, so we test Landing's rendering contract — not the
// real registry or any flow's network call.
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

// Import after the mock is registered.
const { default: Landing } = await import('./Landing.svelte');

describe('Landing board', () => {
  it('shows three skeleton placeholders while stats load', () => {
    // A never-resolving getStats keeps the page in its loading state.
    getFlows.mockReturnValue([makeFlow('spotify', () => new Promise<FlowStats>(() => {}))]);

    const { container } = render(Landing);

    expect(container.querySelectorAll('.skeleton')).toHaveLength(3);
  });

  it('renders a card per registered flow plus the YouTube placeholder', async () => {
    getFlows.mockReturnValue([
      makeFlow('spotify', { count: 12, status: 'active' }, { name: 'Spotify Flow' }),
    ]);

    render(Landing);

    expect(await screen.findByText('Spotify Flow')).toBeInTheDocument();
    // The hardcoded "coming soon" placeholder always appears.
    expect(screen.getByText('YouTube Flow')).toBeInTheDocument();
    // Skeletons are gone once loaded.
    expect(document.querySelectorAll('.skeleton')).toHaveLength(0);
  });

  it('makes active flows clickable links to their route', async () => {
    getFlows.mockReturnValue([
      makeFlow('spotify', { count: 5, status: 'active' }, { name: 'Spotify Flow' }),
    ]);

    render(Landing);

    const card = (await screen.findByText('Spotify Flow')).closest('a');
    expect(card).toHaveAttribute('href', '/spotify');
    expect(card?.className).toContain('cursor-pointer');
    expect(card?.className).not.toContain('cursor-not-allowed');
  });

  it('treats configured flows as clickable too', async () => {
    getFlows.mockReturnValue([
      makeFlow('lyrics', { count: 0, status: 'configured' }, { name: 'Lyrics Flow' }),
    ]);

    render(Landing);

    const card = (await screen.findByText('Lyrics Flow')).closest('a');
    expect(card).toHaveAttribute('href', '/lyrics');
    expect(card?.className).toContain('cursor-pointer');
  });

  it('renders disabled flows as non-clickable (no href, not-allowed cursor)', async () => {
    getFlows.mockReturnValue([
      makeFlow(
        'trading',
        { count: 0, status: 'disabled', statusMessage: 'Coming Soon' },
        { name: 'Trading Flow' }
      ),
    ]);

    render(Landing);

    const card = (await screen.findByText('Trading Flow')).closest('a');
    expect(card).not.toHaveAttribute('href');
    expect(card?.className).toContain('cursor-not-allowed');
  });

  it('shows the item count only when greater than zero', async () => {
    getFlows.mockReturnValue([
      makeFlow('spotify', { count: 42, status: 'active' }, { name: 'Spotify Flow' }),
      makeFlow('empty', { count: 0, status: 'active' }, { name: 'Empty Flow' }),
    ]);

    render(Landing);

    await screen.findByText('Spotify Flow');
    expect(screen.getByText('42')).toBeInTheDocument();
    // Items label appears once, for the flow that has a positive count.
    expect(screen.getAllByText('Items')).toHaveLength(1);
  });

  it('falls back to an error status when a flow getStats rejects', async () => {
    getFlows.mockReturnValue([
      makeFlow('broken', () => Promise.reject(new Error('boom')), { name: 'Broken Flow' }),
    ]);

    render(Landing);

    const card = (await screen.findByText('Broken Flow')).closest('a');
    // An error flow is not clickable.
    expect(card).not.toHaveAttribute('href');
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('uses the status message as the badge label when provided', async () => {
    getFlows.mockReturnValue([
      makeFlow(
        'spotify',
        { count: 3, status: 'active', statusMessage: '8 genres' },
        { name: 'Spotify Flow' }
      ),
    ]);

    render(Landing);

    await screen.findByText('Spotify Flow');
    expect(screen.getByText('8 genres')).toBeInTheDocument();
  });

  it('renders the board header and footer chrome', async () => {
    getFlows.mockReturnValue([]);

    render(Landing);

    // "Cosmic Flow" appears in the navbar brand too, so target the board heading.
    expect(screen.getByRole('heading', { name: 'Cosmic Flow' })).toBeInTheDocument();
    expect(screen.getByText('Your data flow playground')).toBeInTheDocument();
    await waitFor(() => {
      // Even with no registered flows, the YouTube placeholder still shows.
      expect(screen.getByText('YouTube Flow')).toBeInTheDocument();
    });
  });
});
