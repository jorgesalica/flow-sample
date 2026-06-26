import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import type { TopStats } from '@lib/types';
import InsightsPanel from './InsightsPanel.svelte';

function makeStats(overrides: Partial<TopStats> = {}): TopStats {
  return {
    total: 0,
    artists: 0,
    topGenre: '—',
    genres: [],
    decadeDistribution: {},
    ...overrides,
  };
}

// NOTE: The populated branch of InsightsPanel mounts GenreChart + DecadeChart,
// which require chart.js + a real canvas and do not render under jsdom. We only
// assert the guarded empty branch here (negative space). The chart branch is
// covered by the chart components' own (skipped) suites.
describe('InsightsPanel', () => {
  it('renders nothing when there are no genres', () => {
    const { container } = render(InsightsPanel, { props: { stats: makeStats({ genres: [] }) } });

    // Whole panel is guarded by {#if stats.genres.length > 0}.
    expect(container.textContent?.trim()).toBe('');
    expect(container.querySelector('.glass')).toBeNull();
  });
});
