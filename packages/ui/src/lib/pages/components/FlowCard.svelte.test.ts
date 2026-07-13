import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { FlowCardModel } from '../types';
import FlowCard from './FlowCard.svelte';

function makeFlow(overrides: Partial<FlowCardModel> = {}): FlowCardModel {
  return {
    id: 'spotify',
    name: 'Spotify Flow',
    icon: '🎵',
    description: 'Explore your music library.',
    route: '/spotify',
    color: 'from-green-400 to-emerald-500',
    getStats: async () => ({ count: 12, status: 'active' }),
    stats: { count: 12, status: 'active' },
    ...overrides,
  };
}

describe('FlowCard', () => {
  it('renders available flows as named links', () => {
    render(FlowCard, { props: { flow: makeFlow() } });

    expect(screen.getByRole('link', { name: 'Open Spotify Flow' })).toHaveAttribute(
      'href',
      '/spotify'
    );
    expect(screen.getByText('Active')).toHaveClass('ui-badge--success');
  });

  it('renders unavailable flows as disabled articles', () => {
    render(FlowCard, {
      props: {
        flow: makeFlow({ stats: { count: 0, status: 'disabled' } }),
      },
    });

    expect(screen.queryByRole('link', { name: 'Open Spotify Flow' })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Spotify Flow: Unavailable' })).toHaveAttribute(
      'data-state',
      'unavailable'
    );
    expect(screen.getByText('Unavailable')).toHaveClass('ui-badge--neutral');
  });

  it('shows custom status messages and positive item counts', () => {
    render(FlowCard, {
      props: {
        flow: makeFlow({ stats: { count: 42, status: 'configured', statusMessage: 'Stopped' } }),
      },
    });

    expect(screen.getByText('Stopped')).toHaveClass('ui-badge--info');
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Items')).toBeInTheDocument();
  });
});
