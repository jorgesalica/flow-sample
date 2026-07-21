import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { Board } from '@flows/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BoardCardState,
  BoardCardTone,
  type BoardCardSnapshot,
  type FlowDefinition,
} from '@lib/flows';
import {
  BOARD_LAYOUT_MIGRATION_KEY,
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

function makeBoard(
  flows: FlowDefinition[],
  items: Board['items'] = flows.map((flow) => ({
    flowId: flow.id,
    collapsed: false,
    size: BoardItemSize.COMPACT,
  }))
): Board {
  return {
    id: 'board-1',
    name: 'My Board',
    isDefault: true,
    layoutVersion: BOARD_LAYOUT_VERSION,
    items,
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
  };
}

function renderBoard(
  flows: FlowDefinition[],
  options: {
    board?: Board;
    onlayoutchange?: (layout: BoardLayout) => Promise<void>;
  } = {}
) {
  const onlayoutchange =
    options.onlayoutchange ?? vi.fn<(layout: BoardLayout) => Promise<void>>().mockResolvedValue();
  render(FlowBoard, {
    props: {
      flows,
      board: options.board ?? makeBoard(flows),
      onlayoutchange,
    },
  });
  return { onlayoutchange };
}

function boardOrder(): string[] {
  return [...document.querySelectorAll<HTMLElement>('[data-board-id]')].map(
    (element) => element.dataset.boardId ?? ''
  );
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

    renderBoard(flows);

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

  it('restores server-backed order, collapsed state, and size', async () => {
    const flows = [makeFlow('spotify'), makeFlow('lyrics'), makeFlow('trading')];
    const board = makeBoard(flows, [
      { flowId: 'lyrics', collapsed: true, size: BoardItemSize.WIDE },
      { flowId: 'spotify', collapsed: false, size: BoardItemSize.STANDARD },
      { flowId: 'trading', collapsed: false, size: BoardItemSize.COMPACT },
    ]);

    renderBoard(flows, { board });

    await screen.findByText('Lyrics Flow');
    expect(boardOrder()).toEqual(['lyrics', 'spotify', 'trading']);
    expect(screen.getByRole('button', { name: 'Expand Lyrics Flow' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Size for Lyrics Flow' })).toHaveValue(
      BoardItemSize.WIDE
    );
  });

  it('migrates the legacy local layout once through the server callback', async () => {
    const flows = [makeFlow('spotify'), makeFlow('lyrics')];
    window.localStorage.setItem(
      BOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        version: BOARD_LAYOUT_VERSION,
        items: [
          { id: 'lyrics', collapsed: true, size: BoardItemSize.WIDE },
          { id: 'spotify', collapsed: false, size: BoardItemSize.COMPACT },
        ],
      })
    );
    const onlayoutchange = vi.fn<(layout: BoardLayout) => Promise<void>>().mockResolvedValue();

    renderBoard(flows, { onlayoutchange });

    await waitFor(() => expect(onlayoutchange).toHaveBeenCalledOnce());
    expect(onlayoutchange.mock.calls[0]?.[0].items).toEqual([
      { id: 'lyrics', collapsed: true, size: BoardItemSize.WIDE },
      { id: 'spotify', collapsed: false, size: BoardItemSize.COMPACT },
    ]);
    expect(window.localStorage.getItem(BOARD_LAYOUT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(BOARD_LAYOUT_MIGRATION_KEY)).toBe(
      String(BOARD_LAYOUT_VERSION)
    );
  });

  it('saves reorder operations and resets through the server callback', async () => {
    const flows = [makeFlow('spotify'), makeFlow('lyrics'), makeFlow('trading')];
    const onlayoutchange = vi.fn<(layout: BoardLayout) => Promise<void>>().mockResolvedValue();
    renderBoard(flows, { onlayoutchange });
    await screen.findByRole('link', { name: 'Open Spotify Flow' });

    const resetButton = screen.getByRole('button', { name: 'Reset layout' });
    expect(resetButton).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Move Spotify Flow later' }));

    await waitFor(() => expect(onlayoutchange).toHaveBeenCalledOnce());
    expect(boardOrder()).toEqual(['lyrics', 'spotify', 'trading']);
    expect(onlayoutchange.mock.calls[0]?.[0].items.map((item) => item.id)).toEqual([
      'lyrics',
      'spotify',
      'trading',
    ]);
    expect(screen.getByText('Spotify Flow moved to position 2.')).toBeInTheDocument();
    await waitFor(() => expect(resetButton).toBeEnabled());

    await fireEvent.click(resetButton);
    await waitFor(() => expect(onlayoutchange).toHaveBeenCalledTimes(2));
    expect(boardOrder()).toEqual(['spotify', 'lyrics', 'trading']);
    expect(
      onlayoutchange.mock.calls[1]?.[0].items.every((item) => item.size === BoardItemSize.COMPACT)
    ).toBe(true);
  });

  it('saves collapse and size preferences', async () => {
    const flows = [makeFlow('spotify'), makeFlow('lyrics'), makeFlow('trading')];
    const onlayoutchange = vi.fn<(layout: BoardLayout) => Promise<void>>().mockResolvedValue();
    renderBoard(flows, { onlayoutchange });
    await screen.findByRole('link', { name: 'Open Lyrics Flow' });

    await fireEvent.click(screen.getByRole('button', { name: 'Collapse Lyrics Flow' }));
    await waitFor(() => expect(onlayoutchange).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Expand Lyrics Flow' })).toBeEnabled()
    );
    await fireEvent.change(screen.getByRole('combobox', { name: 'Size for Lyrics Flow' }), {
      target: { value: BoardItemSize.WIDE },
    });

    await waitFor(() => expect(onlayoutchange).toHaveBeenCalledTimes(2));
    const lyrics = onlayoutchange.mock.calls[1]?.[0].items.find((item) => item.id === 'lyrics');
    expect(lyrics).toMatchObject({ collapsed: true, size: BoardItemSize.WIDE });
  });

  it('reconciles newly registered flows with persisted server state', async () => {
    const flows = [makeFlow('spotify'), makeFlow('lyrics')];
    const board = makeBoard(flows, [
      { flowId: 'spotify', collapsed: false, size: BoardItemSize.COMPACT },
    ]);
    const onlayoutchange = vi.fn<(layout: BoardLayout) => Promise<void>>().mockResolvedValue();

    renderBoard(flows, { board, onlayoutchange });

    await waitFor(() => expect(onlayoutchange).toHaveBeenCalledOnce());
    expect(onlayoutchange.mock.calls[0]?.[0].items.map((item) => item.id)).toEqual([
      'spotify',
      'lyrics',
    ]);
  });

  it('rolls back optimistic layout changes when persistence fails', async () => {
    const flows = [makeFlow('spotify'), makeFlow('lyrics')];
    const onlayoutchange = vi
      .fn<(layout: BoardLayout) => Promise<void>>()
      .mockRejectedValue(new Error('offline'));
    renderBoard(flows, { onlayoutchange });
    await screen.findByRole('link', { name: 'Open Spotify Flow' });

    await fireEvent.click(screen.getByRole('button', { name: 'Move Spotify Flow later' }));

    await waitFor(() => expect(boardOrder()).toEqual(['spotify', 'lyrics']));
    expect(screen.getByText('Board changes could not be saved.')).toBeInTheDocument();
  });

  it('retains the last ready summary as stale when a refresh fails', async () => {
    const load = vi.fn<() => Promise<BoardCardSnapshot>>();
    load.mockResolvedValueOnce(readyCard('42')).mockResolvedValueOnce(errorCard());
    renderBoard([makeFlow('spotify', load)]);

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
