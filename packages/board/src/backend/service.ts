import {
  BOARD_ITEM_SIZES,
  BOARD_LAYOUT_VERSION,
  type Board,
  type BoardCreateRequest,
  type BoardItem,
  type BoardLayoutUpdateRequest,
  type BoardsSnapshot,
} from '@flows/shared';
import { BoardConflictError, BoardNotFoundError, BoardValidationError } from '../domain/errors';
import type { BoardRepository } from '../domain/ports';

export const DEFAULT_BOARD_ID = 'default';
export const DEFAULT_BOARD_NAME = 'My Board';
const MAX_BOARD_NAME_LENGTH = 80;
const MAX_BOARD_ITEMS = 100;

export interface BoardApplication {
  snapshot(): BoardsSnapshot;
  create(input: BoardCreateRequest): BoardsSnapshot;
  rename(id: string, name: string): BoardsSnapshot;
  updateLayout(id: string, input: BoardLayoutUpdateRequest): BoardsSnapshot;
  select(id: string): BoardsSnapshot;
  delete(id: string): BoardsSnapshot;
}

export interface BoardServiceOptions {
  createId?: () => string;
  now?: () => string;
}

export class BoardService implements BoardApplication {
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(
    private readonly repository: BoardRepository,
    options: BoardServiceOptions = {},
  ) {
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date().toISOString());
    this.ensureDefaultBoard();
    this.ensureActiveBoard();
  }

  snapshot(): BoardsSnapshot {
    return {
      boards: this.repository.list(),
      activeBoard: this.ensureActiveBoard(),
    };
  }

  create(input: BoardCreateRequest): BoardsSnapshot {
    const name = this.validateName(input.name);
    this.ensureUniqueName(name);
    const timestamp = this.now();
    const board: Board = {
      id: `board_${this.createId()}`,
      name,
      isDefault: false,
      layoutVersion: input.layoutVersion ?? BOARD_LAYOUT_VERSION,
      items: this.validateItems(input.items ?? []),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.validateLayoutVersion(board.layoutVersion);
    const created = this.repository.create(board);
    this.repository.select(created.id);
    return this.snapshot();
  }

  rename(id: string, value: string): BoardsSnapshot {
    this.requireBoard(id);
    const name = this.validateName(value);
    this.ensureUniqueName(name, id);
    if (!this.repository.rename(id, name, this.now())) throw new BoardNotFoundError(id);
    return this.snapshot();
  }

  updateLayout(id: string, input: BoardLayoutUpdateRequest): BoardsSnapshot {
    this.requireBoard(id);
    this.validateLayoutVersion(input.layoutVersion);
    const items = this.validateItems(input.items);
    if (!this.repository.updateLayout(id, input.layoutVersion, items, this.now())) {
      throw new BoardNotFoundError(id);
    }
    return this.snapshot();
  }

  select(id: string): BoardsSnapshot {
    this.requireBoard(id);
    this.repository.select(id);
    return this.snapshot();
  }

  delete(id: string): BoardsSnapshot {
    const board = this.requireBoard(id);
    if (board.isDefault) throw new BoardConflictError('The default board cannot be deleted');
    if (!this.repository.delete(id)) throw new BoardNotFoundError(id);
    return this.snapshot();
  }

  private ensureDefaultBoard(): Board {
    const existing = this.repository.findDefault();
    if (existing) return existing;

    const timestamp = this.now();
    return this.repository.create({
      id: DEFAULT_BOARD_ID,
      name: DEFAULT_BOARD_NAME,
      isDefault: true,
      layoutVersion: BOARD_LAYOUT_VERSION,
      items: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  private ensureActiveBoard(): Board {
    const active = this.repository.findActive();
    if (active) return active;
    const fallback = this.ensureDefaultBoard();
    this.repository.select(fallback.id);
    return fallback;
  }

  private requireBoard(id: string): Board {
    const board = this.repository.findById(id);
    if (!board) throw new BoardNotFoundError(id);
    return board;
  }

  private validateName(value: string): string {
    const name = value.trim();
    if (name.length === 0) throw new BoardValidationError('Board name is required');
    if (name.length > MAX_BOARD_NAME_LENGTH) {
      throw new BoardValidationError(
        `Board name cannot exceed ${MAX_BOARD_NAME_LENGTH} characters`,
      );
    }
    return name;
  }

  private ensureUniqueName(name: string, currentId?: string): void {
    const existing = this.repository.findByName(name);
    if (existing && existing.id !== currentId) {
      throw new BoardConflictError('A board with that name already exists');
    }
  }

  private validateLayoutVersion(value: number): asserts value is typeof BOARD_LAYOUT_VERSION {
    if (value !== BOARD_LAYOUT_VERSION) {
      throw new BoardValidationError(`Unsupported board layout version: ${value}`);
    }
  }

  private validateItems(items: BoardItem[]): BoardItem[] {
    if (items.length > MAX_BOARD_ITEMS) {
      throw new BoardValidationError(`A board cannot contain more than ${MAX_BOARD_ITEMS} items`);
    }

    const flowIds = new Set<string>();
    return items.map((item) => {
      const flowId = item.flowId.trim();
      if (!flowId) throw new BoardValidationError('Board item flowId is required');
      if (flowIds.has(flowId)) throw new BoardValidationError(`Duplicate board item: ${flowId}`);
      if (!BOARD_ITEM_SIZES.some((size) => size === item.size)) {
        throw new BoardValidationError(`Unsupported board item size: ${item.size}`);
      }
      flowIds.add(flowId);
      return { flowId, collapsed: item.collapsed, size: item.size };
    });
  }
}
