import { fireEvent, render, screen } from '@testing-library/svelte';
import type { ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import {
  BoardCardState,
  BoardCardTone,
  type BoardCardReady,
  type FlowDefinition,
} from '@lib/flows';
import { BoardItemSize } from '../board-layout';
import BoardItem from './BoardItem.svelte';

type BoardItemProps = ComponentProps<typeof BoardItem>;

const readyCard: BoardCardReady = {
  state: BoardCardState.READY,
  canOpen: true,
  summary: {
    status: { label: 'Active', tone: BoardCardTone.SUCCESS },
    primary: { label: 'Tracks', value: '12', detail: '4 genres' },
  },
  expanded: {
    heading: 'Library snapshot',
    metrics: [{ label: 'Top genre', value: 'rock' }],
  },
};

function makeFlow(overrides: Partial<FlowDefinition> = {}): FlowDefinition {
  return {
    id: 'spotify',
    name: 'Spotify Flow',
    icon: 'M',
    description: 'Explore your music library.',
    route: '/spotify',
    boardCard: { load: async () => readyCard },
    ...overrides,
  };
}

function makeProps(overrides: Partial<BoardItemProps> = {}): BoardItemProps {
  return {
    flow: makeFlow(),
    card: readyCard,
    layout: { id: 'spotify', collapsed: false, size: BoardItemSize.COMPACT },
    position: 0,
    itemCount: 2,
    isDragging: false,
    isDropTarget: false,
    disabled: false,
    onMoveTo: vi.fn(),
    onToggleCollapsed: vi.fn(),
    onSizeChange: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onDragEnter: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    ...overrides,
  };
}

describe('BoardItem', () => {
  it('renders an available contract with navigation, summary, expansion, and layout controls', () => {
    render(BoardItem, { props: makeProps() });

    expect(screen.getByRole('link', { name: 'Open Spotify Flow' })).toHaveAttribute(
      'href',
      '/spotify'
    );
    expect(screen.getByText('Active')).toHaveClass('ui-badge--success');
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Library snapshot' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Layout controls for Spotify Flow' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Spotify Flow earlier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Spotify Flow later' })).toBeEnabled();
  });

  it('keeps failed contracts non-interactive', () => {
    render(BoardItem, {
      props: makeProps({
        card: {
          state: BoardCardState.ERROR,
          canOpen: false,
          status: { label: 'Error', tone: BoardCardTone.DANGER },
          title: 'Summary unavailable',
          message: 'Try refreshing the board.',
        },
      }),
    });

    expect(screen.queryByRole('link', { name: 'Open Spotify Flow' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-board-id="spotify"]')).toHaveAttribute(
      'data-state',
      BoardCardState.ERROR
    );
    expect(document.querySelector('[data-board-id="spotify"]')).toHaveAttribute(
      'data-openable',
      'false'
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Summary unavailable');
  });

  it('collapses expanded content while retaining the summary contract', () => {
    render(BoardItem, {
      props: makeProps({
        layout: { id: 'spotify', collapsed: true, size: BoardItemSize.STANDARD },
      }),
    });

    expect(screen.getByRole('button', { name: 'Expand Spotify Flow' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByText('12')).toBeVisible();
    expect(screen.queryByText('Explore your music library.')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Library snapshot' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-board-id="spotify"]')).toHaveAttribute(
      'data-size',
      BoardItemSize.STANDARD
    );
  });

  it('delegates keyboard controls, size changes, and drag events', async () => {
    const props = makeProps();
    render(BoardItem, { props });

    await fireEvent.click(screen.getByRole('button', { name: 'Move Spotify Flow later' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Collapse Spotify Flow' }));
    await fireEvent.change(screen.getByRole('combobox', { name: 'Size for Spotify Flow' }), {
      target: { value: BoardItemSize.WIDE },
    });
    const article = document.querySelector<HTMLElement>('[data-board-id="spotify"]');
    expect(article).not.toBeNull();
    if (article) await fireEvent.dragStart(article);

    expect(props.onMoveTo).toHaveBeenCalledWith(1);
    expect(props.onToggleCollapsed).toHaveBeenCalledOnce();
    expect(props.onSizeChange).toHaveBeenCalledWith(BoardItemSize.WIDE);
    expect(props.onDragStart).toHaveBeenCalledOnce();
  });
});
