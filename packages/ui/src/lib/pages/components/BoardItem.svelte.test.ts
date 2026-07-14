import { fireEvent, render, screen } from '@testing-library/svelte';
import type { ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { BoardItemSize } from '../board-layout';
import type { FlowCardModel } from '../types';
import BoardItem from './BoardItem.svelte';

type BoardItemProps = ComponentProps<typeof BoardItem>;

function makeFlow(overrides: Partial<FlowCardModel> = {}): FlowCardModel {
  return {
    id: 'spotify',
    name: 'Spotify Flow',
    icon: 'M',
    description: 'Explore your music library.',
    route: '/spotify',
    color: 'unused',
    getStats: async () => ({ count: 12, status: 'active' }),
    stats: { count: 12, status: 'active' },
    ...overrides,
  };
}

function makeProps(overrides: Partial<BoardItemProps> = {}): BoardItemProps {
  return {
    flow: makeFlow(),
    layout: { id: 'spotify', collapsed: false, size: BoardItemSize.COMPACT },
    position: 0,
    itemCount: 2,
    isDragging: false,
    isDropTarget: false,
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
  it('renders an available flow with navigation, status, count, and layout controls', () => {
    render(BoardItem, { props: makeProps() });

    expect(screen.getByRole('link', { name: 'Open Spotify Flow' })).toHaveAttribute(
      'href',
      '/spotify'
    );
    expect(screen.getByText('Active')).toHaveClass('ui-badge--success');
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Layout controls for Spotify Flow' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Spotify Flow earlier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Spotify Flow later' })).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'Size for Spotify Flow' })).toHaveValue(
      BoardItemSize.COMPACT
    );
  });

  it('keeps unavailable flows non-interactive', () => {
    render(BoardItem, {
      props: makeProps({
        flow: makeFlow({ stats: { count: 0, status: 'disabled' } }),
      }),
    });

    expect(screen.queryByRole('link', { name: 'Open Spotify Flow' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-board-id="spotify"]')).toHaveAttribute(
      'data-state',
      'unavailable'
    );
    expect(screen.getByText('Unavailable')).toHaveClass('ui-badge--neutral');
  });

  it('exposes collapsed state through the native disclosure contract', () => {
    render(BoardItem, {
      props: makeProps({
        layout: { id: 'spotify', collapsed: true, size: BoardItemSize.STANDARD },
      }),
    });

    expect(screen.getByRole('button', { name: 'Expand Spotify Flow' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByText('Explore your music library.')).not.toBeVisible();
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
