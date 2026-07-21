export const BOARD_LAYOUT_VERSION = 1 as const;
export type BoardLayoutVersion = typeof BOARD_LAYOUT_VERSION;

export const BOARD_ITEM_SIZES = ['compact', 'standard', 'wide'] as const;
export type BoardItemSize = (typeof BOARD_ITEM_SIZES)[number];

export interface BoardItem {
  flowId: string;
  collapsed: boolean;
  size: BoardItemSize;
}

export interface Board {
  id: string;
  name: string;
  isDefault: boolean;
  layoutVersion: BoardLayoutVersion;
  items: BoardItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardsSnapshot {
  boards: Board[];
  activeBoard: Board;
}

export interface BoardCreateRequest {
  name: string;
  layoutVersion?: BoardLayoutVersion;
  items?: BoardItem[];
}

export interface BoardRenameRequest {
  name: string;
}

export interface BoardLayoutUpdateRequest {
  layoutVersion: BoardLayoutVersion;
  items: BoardItem[];
}

export interface BoardErrorResponse {
  error: string;
}
