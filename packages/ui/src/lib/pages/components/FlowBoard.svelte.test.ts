import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BoardCardState,
  BoardCardTone,
  type BoardCardSnapshot,
  type FlowDefinition,
} from '@lib/flows';
import {
  BOARD_LAYOUT_STORAGE_KEY,
  BOARD_LAYOUT_VERSION,
  BoardItemSize,
  type BoardLayout,
} from '../board-layout';
import FlowBoard from './FlowBoard.svelte';

function readyCard(value = '1'): BoardCardSnapshot {
  return {
    state: BoardCardState.READY,
    canOpen: true,
    summary: {
      status: { label: 'Active', tone: BoardCardTone.SUCCESS },
      primary: { label: 'Items', value },
    },
  };
}

function errorCard(): BoardCardSnapshot {
  return {
    state: BoardCardState.ERROR,
    canOpen: false,
    status: { label: 'Error', tone: BoardCardTone.DANGER },
    title: 'Summary unavailable',
    message: 'Try refreshing the board.',
  };
}

function makeFlow(
  id: string,
  load: () => Promise<BoardCardSnapshot> = async () => readyCard()
): FlowDefinition {
  return {
    id,
    name: `${id[0]?.toUpperCase()}${id.slice(1)} Flow`,
    icon: id[0]?.toUpperCase() ?? 'F',
    description: `${id} description`,
    route: `/${id}`,
    boardCard: { load },
  };
}

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('FlowBoard', () => {
  it('loads cards independently instead of blocking the whole board', async () => {
    const spotify = deferred<BoardCardSnapshot>();
    const flows = [makeFlow('spotify', () => spotify.promise), makeFlow('lyrics')];

    render(FlowBoard, { props: { flows } });

    expect(await screen.findByRole('link', { name: 'Open Lyrics Flow' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Spotify Flow' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-board-id="spotify"]')).toHaveAttribute(
      'aria-busy',
      'true'
    );

    spotify.resolve(readyCard('42'));
    expect(await screen.findByRole('link', { name: 'Open Spotify Flow' })).toBeInTheDocument();
    expect(screen.getByText('2 ready')).toBeInTheDocument();
  });

  it('restores saved order, collapsed state, and size', async () => {
    const flows = [makeFlow('spotify'), makeFlow('lyrics'), makeFlow('trading')];
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

    render(FlowBoard, { props: { flows } });

    await screen.findByRole('link', { name: 'Open Lyrics Flow' });
    expect(boardOrder()).toEqual(['lyrics', 'spotify', 'trading']);
    expect(screen.getByRole('button', { name: 'Expand Lyrics Flow' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Size for Lyrics Flow' })).toHaveValue(
      BoardItemSize.WIDE
    );
  });

  it('reorders with explicit controls, persists, announces, and resets', async () => {
    const flows = [makeFlow('spotify'), makeFlow('lyrics'), makeFlow('trading')];
    render(FlowBoard, { props: { flows } });
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
    const flows = [makeFlow('spotify'), makeFlow('lyrics'), makeFlow('trading')];
    render(FlowBoard, { props: { flows } });
    await screen.findByRole('link', { name: 'Open Lyrics Flow' });

    await fireEvent.click(screen.getByRole('button', { name: 'Collapse Lyrics Flow' }));
    await fireEvent.change(screen.getByRole('combobox', { name: 'Size for Lyrics Flow' }), {
      target: { value: BoardItemSize.WIDE },
    });

    const lyrics = savedLayout().items.find((item) => item.id === 'lyrics');
    expect(lyrics).toMatchObject({ collapsed: true, size: BoardItemSize.WIDE });
  });

  it('falls back safely from persisted layout data with an old version', async () => {
    const flows = [makeFlow('spotify'), makeFlow('lyrics')];
    window.localStorage.setItem(
      BOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({ version: 0, items: [] })
    );

    render(FlowBoard, { props: { flows } });

    await waitFor(() => expect(boardOrder()).toEqual(['spotify', 'lyrics']));
    expect(screen.getByRole('button', { name: 'Reset layout' })).toBeDisabled();
  });

  it('retains the last ready summary as stale when a refresh fails', async () => {
    const load = vi.fn<() => Promise<BoardCardSnapshot>>();
    load.mockResolvedValueOnce(readyCard('42')).mockResolvedValueOnce(errorCard());
    render(FlowBoard, { props: { flows: [makeFlow('spotify', load)] } });

    expect(await screen.findByText('42')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh summaries' }));

    expect(await screen.findByText('Stale')).toHaveClass('ui-badge--warning');
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Refresh failed. Showing the previous summary.'
    );
    expect(load).toHaveBeenCalledTimes(2);
  });
});
