export const BOARD_LAYOUT_STORAGE_KEY = 'flow-sample:board-layout';
export const BOARD_LAYOUT_VERSION = 1 as const;

export const BoardItemSize = {
  COMPACT: 'compact',
  STANDARD: 'standard',
  WIDE: 'wide',
} as const;

export type BoardItemSize = (typeof BoardItemSize)[keyof typeof BoardItemSize];

export interface BoardItemLayout {
  id: string;
  collapsed: boolean;
  size: BoardItemSize;
}

export interface BoardLayout {
  version: typeof BOARD_LAYOUT_VERSION;
  items: BoardItemLayout[];
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

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

export function reconcileBoardLayout(value: unknown, flowIds: readonly string[]): BoardLayout {
  const fallback = createDefaultBoardLayout(flowIds);
  if (!isRecord(value) || value.version !== BOARD_LAYOUT_VERSION || !Array.isArray(value.items)) {
    return fallback;
  }

  const knownIds = new Set(fallback.items.map((item) => item.id));
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
      return fallback;
    }

    seenIds.add(candidate.id);
    if (knownIds.has(candidate.id)) {
      items.push({
        id: candidate.id,
        collapsed: candidate.collapsed,
        size: candidate.size,
      });
    }
  }

  for (const defaultItem of fallback.items) {
    if (!seenIds.has(defaultItem.id)) items.push(defaultItem);
  }

  return { version: BOARD_LAYOUT_VERSION, items };
}

export function loadBoardLayout(storage: ReadableStorage, flowIds: readonly string[]): BoardLayout {
  try {
    const serialized = storage.getItem(BOARD_LAYOUT_STORAGE_KEY);
    return serialized === null
      ? createDefaultBoardLayout(flowIds)
      : reconcileBoardLayout(JSON.parse(serialized), flowIds);
  } catch {
    return createDefaultBoardLayout(flowIds);
  }
}

export function persistBoardLayout(storage: WritableStorage, layout: BoardLayout): boolean {
  try {
    storage.setItem(BOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
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
