import { describe, expect, it, vi } from 'vitest';
import {
  BOARD_LAYOUT_STORAGE_KEY,
  BOARD_LAYOUT_VERSION,
  BoardItemSize,
  createDefaultBoardLayout,
  isDefaultBoardLayout,
  loadBoardLayout,
  persistBoardLayout,
  reconcileBoardLayout,
  reorderBoardItem,
  updateBoardItem,
} from './board-layout';

const flowIds = ['spotify', 'lyrics', 'trading'];

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

  it('loads valid JSON and falls back when storage cannot be read', () => {
    const getItem = vi.fn().mockReturnValue(
      JSON.stringify({
        version: BOARD_LAYOUT_VERSION,
        items: [{ id: 'lyrics', collapsed: true, size: BoardItemSize.WIDE }],
      })
    );
    expect(loadBoardLayout({ getItem }, flowIds).items[0]?.id).toBe('lyrics');
    expect(getItem).toHaveBeenCalledWith(BOARD_LAYOUT_STORAGE_KEY);

    const unavailableStorage = { getItem: () => JSON.parse('{') };
    expect(loadBoardLayout(unavailableStorage, flowIds)).toEqual(createDefaultBoardLayout(flowIds));
  });

  it('persists the versioned layout and tolerates write failures', () => {
    const setItem = vi.fn();
    const layout = createDefaultBoardLayout(flowIds);
    expect(persistBoardLayout({ setItem }, layout)).toBe(true);
    expect(setItem).toHaveBeenCalledWith(BOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));

    expect(
      persistBoardLayout(
        {
          setItem: () => {
            throw new Error('quota exceeded');
          },
        },
        layout
      )
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
