import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { BoardsSnapshot } from '@flows/shared';
import {
  BoardCardState,
  BoardCardTone,
  type BoardCardSnapshot,
  type FlowDefinition,
} from '@lib/flows';

const getFlows = vi.fn<() => FlowDefinition[]>();
vi.mock('@lib/flows', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lib/flows')>()),
  getFlows: () => getFlows(),
}));

function makeFlow(
  id: string,
  snapshot: BoardCardSnapshot | (() => Promise<BoardCardSnapshot>),
  overrides: Partial<FlowDefinition> = {}
): FlowDefinition {
  const load = typeof snapshot === 'function' ? snapshot : async () => snapshot;
  return {
    id,
    name: `${id} Flow`,
    icon: 'M',
    description: `${id} description`,
    route: `/${id}`,
    boardCard: { load },
    ...overrides,
  };
}

const readyCard: BoardCardSnapshot = {
  state: BoardCardState.READY,
  canOpen: true,
  summary: {
    status: { label: 'Active', tone: BoardCardTone.SUCCESS },
    primary: { label: 'Tracks', value: '12' },
  },
};

const { default: Landing } = await import('./Landing.svelte');

function snapshotFor(flows: FlowDefinition[]): BoardsSnapshot {
  const activeBoard = {
    id: 'default',
    name: 'My Board',
    isDefault: true,
    layoutVersion: 1 as const,
    items: flows.map((flow) => ({
      flowId: flow.id,
      collapsed: false,
      size: 'compact' as const,
    })),
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
  };
  return { boards: [activeBoard], activeBoard };
}

function renderLanding(flows: FlowDefinition[]) {
  getFlows.mockReturnValue(flows);
  return render(Landing, { props: { data: { snapshot: snapshotFor(flows) } } });
}

describe('Landing board', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sets the branded page title', () => {
    renderLanding([]);
    expect(document.title).toBe('Cosmic Flow - Data Exploration Hub');
  });

  it('renders registered items immediately while their summaries load independently', async () => {
    const flows = [
      makeFlow('spotify', () => new Promise<BoardCardSnapshot>(() => {}), {
        name: 'Spotify Flow',
      }),
    ];

    renderLanding(flows);

    expect(await screen.findByText('Spotify Flow')).toBeInTheDocument();
    expect(screen.getByText('Loading summary')).toBeInTheDocument();
    expect(screen.queryByText('YouTube Flow')).not.toBeInTheDocument();
  });

  it('preserves route navigation supplied by a successful card contract', async () => {
    const flows = [makeFlow('spotify', readyCard, { name: 'Spotify Flow' })];

    renderLanding(flows);

    expect(await screen.findByRole('link', { name: 'Open Spotify Flow' })).toHaveAttribute(
      'href',
      '/spotify'
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('isolates a failed summary contract to its board item', async () => {
    const flows = [
      makeFlow('broken', {
        state: BoardCardState.ERROR,
        canOpen: false,
        status: { label: 'Error', tone: BoardCardTone.DANGER },
        title: 'Summary unavailable',
        message: 'Try refreshing the board.',
      }),
      makeFlow('spotify', readyCard, { name: 'Spotify Flow' }),
    ];

    renderLanding(flows);

    expect(await screen.findByRole('link', { name: 'Open Spotify Flow' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open broken Flow' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Summary unavailable');
  });
});
