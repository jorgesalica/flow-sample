import type {
  Board,
  BoardItem,
  BoardItemSize as PersistedBoardItemSize,
  BoardLayoutVersion,
} from '@flows/shared';

export const BOARD_LAYOUT_STORAGE_KEY = 'flow-sample:board-layout';
export const BOARD_LAYOUT_MIGRATION_KEY = 'flow-sample:board-layout-migrated-v1';
export const BOARD_LAYOUT_VERSION = 1 as const satisfies BoardLayoutVersion;

export const BoardItemSize = {
  COMPACT: 'compact',
  STANDARD: 'standard',
  WIDE: 'wide',
} as const satisfies Record<string, PersistedBoardItemSize>;

export type BoardItemSize = PersistedBoardItemSize;

export interface BoardItemLayout {
  id: string;
  collapsed: boolean;
  size: BoardItemSize;
}

export interface BoardLayout {
  version: typeof BOARD_LAYOUT_VERSION;
  items: BoardItemLayout[];
}

type MigrationStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface BoardLayoutMigration {
  found: boolean;
  layout: BoardLayout | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isBoardItemSize(value: unknown): value is BoardItemSize {
  return Object.values(BoardItemSize).some((size) => size === value);
}

function uniqueFlowIds(flowIds: readonly string[]): string[] {
  return [...new Set(flowIds.filter((id) => id.length > 0))];
}

function createDefaultItem(id: string): BoardItemLayout {
  return { id, collapsed: false, size: BoardItemSize.COMPACT };
}

export function createDefaultBoardLayout(flowIds: readonly string[]): BoardLayout {
  return {
    version: BOARD_LAYOUT_VERSION,
    items: uniqueFlowIds(flowIds).map(createDefaultItem),
  };
}

function parseBoardLayout(value: unknown): BoardLayout | null {
  if (!isRecord(value) || value.version !== BOARD_LAYOUT_VERSION || !Array.isArray(value.items)) {
    return null;
  }

  const seenIds = new Set<string>();
  const items: BoardItemLayout[] = [];

  for (const candidate of value.items) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== 'string' ||
      typeof candidate.collapsed !== 'boolean' ||
      !isBoardItemSize(candidate.size) ||
      seenIds.has(candidate.id)
    ) {
      return null;
    }

    seenIds.add(candidate.id);
    items.push({
      id: candidate.id,
      collapsed: candidate.collapsed,
      size: candidate.size,
    });
  }

  return { version: BOARD_LAYOUT_VERSION, items };
}

export function reconcileBoardLayout(value: unknown, flowIds: readonly string[]): BoardLayout {
  const fallback = createDefaultBoardLayout(flowIds);
  const parsed = parseBoardLayout(value);
  if (!parsed) return fallback;

  const knownIds = new Set(fallback.items.map((item) => item.id));
  const seenIds = new Set<string>();
  const items = parsed.items.filter((item) => {
    if (!knownIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  for (const defaultItem of fallback.items) {
    if (!seenIds.has(defaultItem.id)) items.push(defaultItem);
  }

  return { version: BOARD_LAYOUT_VERSION, items };
}

export function boardToLayout(board: Board, flowIds: readonly string[]): BoardLayout {
  return reconcileBoardLayout(
    {
      version: board.layoutVersion,
      items: board.items.map((item) => ({
        id: item.flowId,
        collapsed: item.collapsed,
        size: item.size,
      })),
    },
    flowIds
  );
}

export function layoutToBoardItems(layout: BoardLayout): BoardItem[] {
  return layout.items.map((item) => ({
    flowId: item.id,
    collapsed: item.collapsed,
    size: item.size,
  }));
}

export function boardMatchesLayout(board: Board, layout: BoardLayout): boolean {
  if (board.layoutVersion !== layout.version || board.items.length !== layout.items.length) {
    return false;
  }

  return board.items.every((item, index) => {
    const layoutItem = layout.items[index];
    return (
      layoutItem !== undefined &&
      item.flowId === layoutItem.id &&
      item.collapsed === layoutItem.collapsed &&
      item.size === layoutItem.size
    );
  });
}

export function readBoardLayoutMigration(
  storage: Pick<MigrationStorage, 'getItem'>,
  flowIds: readonly string[]
): BoardLayoutMigration {
  try {
    if (storage.getItem(BOARD_LAYOUT_MIGRATION_KEY) === String(BOARD_LAYOUT_VERSION)) {
      return { found: false, layout: null };
    }
    const serialized = storage.getItem(BOARD_LAYOUT_STORAGE_KEY);
    if (serialized === null) return { found: false, layout: null };
    const parsed = parseBoardLayout(JSON.parse(serialized));
    return {
      found: true,
      layout: parsed ? reconcileBoardLayout(parsed, flowIds) : null,
    };
  } catch {
    return { found: true, layout: null };
  }
}

export function completeBoardLayoutMigration(storage: MigrationStorage): boolean {
  try {
    storage.setItem(BOARD_LAYOUT_MIGRATION_KEY, String(BOARD_LAYOUT_VERSION));
    storage.removeItem(BOARD_LAYOUT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function reorderBoardItem(
  layout: BoardLayout,
  itemId: string,
  targetIndex: number
): BoardLayout {
  const currentIndex = layout.items.findIndex((item) => item.id === itemId);
  if (currentIndex < 0 || layout.items.length < 2) return layout;

  const boundedIndex = Math.max(0, Math.min(targetIndex, layout.items.length - 1));
  if (currentIndex === boundedIndex) return layout;

  const items = [...layout.items];
  const [item] = items.splice(currentIndex, 1);
  items.splice(boundedIndex, 0, item);
  return { ...layout, items };
}

export function updateBoardItem(
  layout: BoardLayout,
  itemId: string,
  changes: Partial<Pick<BoardItemLayout, 'collapsed' | 'size'>>
): BoardLayout {
  const itemIndex = layout.items.findIndex((item) => item.id === itemId);
  if (itemIndex < 0) return layout;

  const items = [...layout.items];
  items[itemIndex] = { ...items[itemIndex], ...changes };
  return { ...layout, items };
}

export function isDefaultBoardLayout(layout: BoardLayout, flowIds: readonly string[]): boolean {
  const defaultLayout = createDefaultBoardLayout(flowIds);
  if (layout.items.length !== defaultLayout.items.length) return false;
  return layout.items.every((item, index) => {
    const defaultItem = defaultLayout.items[index];
    return (
      defaultItem !== undefined &&
      item.id === defaultItem.id &&
      item.collapsed === defaultItem.collapsed &&
      item.size === defaultItem.size
    );
  });
}
