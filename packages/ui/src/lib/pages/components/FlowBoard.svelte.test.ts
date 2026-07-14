import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BOARD_LAYOUT_STORAGE_KEY,
  BOARD_LAYOUT_VERSION,
  BoardItemSize,
  type BoardLayout,
} from '../board-layout';
import type { FlowCardModel } from '../types';
import FlowBoard from './FlowBoard.svelte';

function makeFlow(id: string): FlowCardModel {
  return {
    id,
    name: `${id[0]?.toUpperCase()}${id.slice(1)} Flow`,
    icon: id[0]?.toUpperCase() ?? 'F',
    description: `${id} description`,
    route: `/${id}`,
    color: 'unused',
    getStats: async () => ({ count: 1, status: 'active' }),
    stats: { count: 1, status: 'active' },
  };
}

const flows = [makeFlow('spotify'), makeFlow('lyrics'), makeFlow('trading')];

function boardOrder(): string[] {
  return [...document.querySelectorAll<HTMLElement>('[data-board-id]')].map(
    (element) => element.dataset.boardId ?? ''
  );
}

function savedLayout(): BoardLayout {
  const serialized = window.localStorage.getItem(BOARD_LAYOUT_STORAGE_KEY);
  if (!serialized) throw new Error('Expected board layout to be persisted');
  return JSON.parse(serialized) as BoardLayout;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('FlowBoard', () => {
  it('restores saved order, collapsed state, and size', async () => {
    window.localStorage.setItem(
      BOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        version: BOARD_LAYOUT_VERSION,
        items: [
          { id: 'lyrics', collapsed: true, size: BoardItemSize.WIDE },
          { id: 'spotify', collapsed: false, size: BoardItemSize.STANDARD },
          { id: 'trading', collapsed: false, size: BoardItemSize.COMPACT },
        ],
      })
    );

    render(FlowBoard, { props: { flows, readyFlowCount: 3 } });

    await screen.findByRole('link', { name: 'Open Lyrics Flow' });
    expect(boardOrder()).toEqual(['lyrics', 'spotify', 'trading']);
    expect(screen.getByRole('button', { name: 'Expand Lyrics Flow' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Size for Lyrics Flow' })).toHaveValue(
      BoardItemSize.WIDE
    );
  });

  it('reorders with explicit controls, persists, announces, and resets', async () => {
    render(FlowBoard, { props: { flows, readyFlowCount: 3 } });
    await screen.findByRole('link', { name: 'Open Spotify Flow' });

    const resetButton = screen.getByRole('button', { name: 'Reset layout' });
    expect(resetButton).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Move Spotify Flow later' }));

    expect(boardOrder()).toEqual(['lyrics', 'spotify', 'trading']);
    expect(savedLayout().items.map((item) => item.id)).toEqual(['lyrics', 'spotify', 'trading']);
    expect(screen.getByText('Spotify Flow moved to position 2.')).toBeInTheDocument();
    expect(resetButton).toBeEnabled();

    await fireEvent.click(resetButton);
    expect(boardOrder()).toEqual(['spotify', 'lyrics', 'trading']);
    expect(savedLayout().items.every((item) => item.size === BoardItemSize.COMPACT)).toBe(true);
  });

  it('persists collapse and size preferences', async () => {
    render(FlowBoard, { props: { flows, readyFlowCount: 3 } });
    await screen.findByRole('link', { name: 'Open Lyrics Flow' });

    await fireEvent.click(screen.getByRole('button', { name: 'Collapse Lyrics Flow' }));
    await fireEvent.change(screen.getByRole('combobox', { name: 'Size for Lyrics Flow' }), {
      target: { value: BoardItemSize.WIDE },
    });

    const lyrics = savedLayout().items.find((item) => item.id === 'lyrics');
    expect(lyrics).toMatchObject({ collapsed: true, size: BoardItemSize.WIDE });
    expect(screen.getByRole('button', { name: 'Expand Lyrics Flow' })).toBeInTheDocument();
  });

  it('falls back safely from persisted data with an old version', async () => {
    window.localStorage.setItem(
      BOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({ version: 0, items: [] })
    );

    render(FlowBoard, { props: { flows, readyFlowCount: 3 } });

    await waitFor(() => expect(boardOrder()).toEqual(['spotify', 'lyrics', 'trading']));
    expect(screen.getByRole('button', { name: 'Reset layout' })).toBeDisabled();
  });
});
