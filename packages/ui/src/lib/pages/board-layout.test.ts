import { describe, expect, it, vi } from 'vitest';
import { BOARD_LAYOUT_VERSION as PERSISTED_LAYOUT_VERSION, type Board } from '@flows/shared';
import {
  BOARD_LAYOUT_MIGRATION_KEY,
  BOARD_LAYOUT_STORAGE_KEY,
  BOARD_LAYOUT_VERSION,
  BoardItemSize,
  boardMatchesLayout,
  boardToLayout,
  completeBoardLayoutMigration,
  createDefaultBoardLayout,
  isDefaultBoardLayout,
  layoutToBoardItems,
  readBoardLayoutMigration,
  reconcileBoardLayout,
  reorderBoardItem,
  updateBoardItem,
} from './board-layout';

const flowIds = ['spotify', 'lyrics', 'trading'];

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: 'default',
    name: 'My Board',
    isDefault: true,
    layoutVersion: PERSISTED_LAYOUT_VERSION,
    items: [
      { flowId: 'lyrics', collapsed: true, size: 'wide' },
      { flowId: 'spotify', collapsed: false, size: 'standard' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('board layout contract', () => {
  it('creates a compact expanded item for every unique registered flow', () => {
    expect(createDefaultBoardLayout([...flowIds, 'spotify', ''])).toEqual({
      version: BOARD_LAYOUT_VERSION,
      items: flowIds.map((id) => ({ id, collapsed: false, size: BoardItemSize.COMPACT })),
    });
  });

  it('restores valid order, collapsed state, and size preferences', () => {
    const restored = reconcileBoardLayout(
      {
        version: BOARD_LAYOUT_VERSION,
        items: [
          { id: 'trading', collapsed: true, size: BoardItemSize.WIDE },
          { id: 'spotify', collapsed: false, size: BoardItemSize.STANDARD },
          { id: 'lyrics', collapsed: false, size: BoardItemSize.COMPACT },
        ],
      },
      flowIds
    );

    expect(restored.items.map((item) => item.id)).toEqual(['trading', 'spotify', 'lyrics']);
    expect(restored.items[0]).toMatchObject({ collapsed: true, size: BoardItemSize.WIDE });
  });

  it('drops removed flows and appends newly registered flows', () => {
    const restored = reconcileBoardLayout(
      {
        version: BOARD_LAYOUT_VERSION,
        items: [
          { id: 'removed', collapsed: true, size: BoardItemSize.WIDE },
          { id: 'lyrics', collapsed: true, size: BoardItemSize.STANDARD },
        ],
      },
      flowIds
    );

    expect(restored.items).toEqual([
      { id: 'lyrics', collapsed: true, size: BoardItemSize.STANDARD },
      { id: 'spotify', collapsed: false, size: BoardItemSize.COMPACT },
      { id: 'trading', collapsed: false, size: BoardItemSize.COMPACT },
    ]);
  });

  it.each([
    null,
    { version: 0, items: [] },
    { version: BOARD_LAYOUT_VERSION, items: 'invalid' },
    {
      version: BOARD_LAYOUT_VERSION,
      items: [{ id: 'spotify', collapsed: 'no', size: BoardItemSize.COMPACT }],
    },
    {
      version: BOARD_LAYOUT_VERSION,
      items: [
        { id: 'spotify', collapsed: false, size: BoardItemSize.COMPACT },
        { id: 'spotify', collapsed: true, size: BoardItemSize.WIDE },
      ],
    },
  ])('falls back when persisted data is invalid or from another version', (value) => {
    expect(reconcileBoardLayout(value, flowIds)).toEqual(createDefaultBoardLayout(flowIds));
  });

  it('maps persisted board DTOs to reconciled UI layouts and back', () => {
    const board = makeBoard();
    const layout = boardToLayout(board, flowIds);

    expect(layout.items.map((item) => item.id)).toEqual(['lyrics', 'spotify', 'trading']);
    expect(layoutToBoardItems(layout)[0]).toEqual({
      flowId: 'lyrics',
      collapsed: true,
      size: 'wide',
    });
    expect(boardMatchesLayout(board, layout)).toBe(false);
    expect(boardMatchesLayout({ ...board, items: layoutToBoardItems(layout) }, layout)).toBe(true);
  });

  it('reads a valid legacy layout once and reconciles current flow IDs', () => {
    const values = new Map([
      [
        BOARD_LAYOUT_STORAGE_KEY,
        JSON.stringify({
          version: BOARD_LAYOUT_VERSION,
          items: [{ id: 'lyrics', collapsed: true, size: BoardItemSize.WIDE }],
        }),
      ],
    ]);
    const getItem = vi.fn((key: string) => values.get(key) ?? null);

    expect(readBoardLayoutMigration({ getItem }, flowIds)).toEqual({
      found: true,
      layout: {
        version: BOARD_LAYOUT_VERSION,
        items: [
          { id: 'lyrics', collapsed: true, size: BoardItemSize.WIDE },
          { id: 'spotify', collapsed: false, size: BoardItemSize.COMPACT },
          { id: 'trading', collapsed: false, size: BoardItemSize.COMPACT },
        ],
      },
    });
  });

  it('does not remigrate completed state and flags malformed legacy data for cleanup', () => {
    const completed = {
      getItem: (key: string) => (key === BOARD_LAYOUT_MIGRATION_KEY ? '1' : '{invalid'),
    };
    expect(readBoardLayoutMigration(completed, flowIds)).toEqual({ found: false, layout: null });

    const malformed = {
      getItem: (key: string) => (key === BOARD_LAYOUT_STORAGE_KEY ? '{invalid' : null),
    };
    expect(readBoardLayoutMigration(malformed, flowIds)).toEqual({ found: true, layout: null });
  });

  it('marks migration complete, removes legacy state, and tolerates storage failure', () => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    expect(completeBoardLayoutMigration({ getItem: vi.fn(), setItem, removeItem })).toBe(true);
    expect(setItem).toHaveBeenCalledWith(BOARD_LAYOUT_MIGRATION_KEY, '1');
    expect(removeItem).toHaveBeenCalledWith(BOARD_LAYOUT_STORAGE_KEY);

    expect(
      completeBoardLayoutMigration({
        getItem: vi.fn(),
        setItem: () => {
          throw new Error('quota exceeded');
        },
        removeItem: vi.fn(),
      })
    ).toBe(false);
  });

  it('reorders items without mutating the previous state', () => {
    const layout = createDefaultBoardLayout(flowIds);
    const reordered = reorderBoardItem(layout, 'spotify', 2);

    expect(reordered.items.map((item) => item.id)).toEqual(['lyrics', 'trading', 'spotify']);
    expect(layout.items.map((item) => item.id)).toEqual(flowIds);
    expect(reorderBoardItem(reordered, 'missing', 0)).toBe(reordered);
  });

  it('updates presentation preferences without changing order', () => {
    const layout = createDefaultBoardLayout(flowIds);
    const updated = updateBoardItem(layout, 'lyrics', {
      collapsed: true,
      size: BoardItemSize.WIDE,
    });

    expect(updated.items[1]).toEqual({
      id: 'lyrics',
      collapsed: true,
      size: BoardItemSize.WIDE,
    });
    expect(updated.items.map((item) => item.id)).toEqual(flowIds);
    expect(isDefaultBoardLayout(layout, flowIds)).toBe(true);
    expect(isDefaultBoardLayout(updated, flowIds)).toBe(false);
    expect(isDefaultBoardLayout({ ...layout, items: [] }, flowIds)).toBe(false);
  });
});
