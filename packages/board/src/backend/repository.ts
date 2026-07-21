import type Database from 'better-sqlite3';
import {
  BOARD_ITEM_SIZES,
  BOARD_LAYOUT_VERSION,
  type Board,
  type BoardItem,
  type BoardItemSize,
} from '@flows/shared';
import type { BoardRepository } from '../domain/ports';

interface BoardRow {
  id: string;
  name: string;
  is_default: number;
  layout_version: number;
  created_at: string;
  updated_at: string;
}

interface BoardItemRow {
  flow_id: string;
  collapsed: number;
  size: string;
}

function isBoardItemSize(value: string): value is BoardItemSize {
  return BOARD_ITEM_SIZES.some((size) => size === value);
}

export class SQLiteBoardRepository implements BoardRepository {
  constructor(private readonly db: Database.Database) {
    this.db.pragma('foreign_keys = ON');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
        layout_version INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS boards_single_default
        ON boards(is_default) WHERE is_default = 1;

      CREATE TABLE IF NOT EXISTS board_items (
        board_id TEXT NOT NULL,
        flow_id TEXT NOT NULL,
        position INTEGER NOT NULL CHECK (position >= 0),
        collapsed INTEGER NOT NULL CHECK (collapsed IN (0, 1)),
        size TEXT NOT NULL CHECK (size IN ('compact', 'standard', 'wide')),
        PRIMARY KEY (board_id, flow_id),
        UNIQUE (board_id, position),
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS board_state (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        active_board_id TEXT,
        FOREIGN KEY (active_board_id) REFERENCES boards(id) ON DELETE SET NULL
      );
    `);
  }

  list(): Board[] {
    const rows = this.db
      .prepare('SELECT * FROM boards ORDER BY is_default DESC, created_at ASC, id ASC')
      .all() as BoardRow[];
    return rows.map((row) => this.hydrate(row));
  }

  findById(id: string): Board | null {
    const row = this.db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as
      | BoardRow
      | undefined;
    return row ? this.hydrate(row) : null;
  }

  findByName(name: string): Board | null {
    const row = this.db.prepare('SELECT * FROM boards WHERE name = ? COLLATE NOCASE').get(name) as
      | BoardRow
      | undefined;
    return row ? this.hydrate(row) : null;
  }

  findDefault(): Board | null {
    const row = this.db.prepare('SELECT * FROM boards WHERE is_default = 1').get() as
      | BoardRow
      | undefined;
    return row ? this.hydrate(row) : null;
  }

  findActive(): Board | null {
    const row = this.db
      .prepare(
        `SELECT boards.*
         FROM board_state
         JOIN boards ON boards.id = board_state.active_board_id
         WHERE board_state.singleton = 1`,
      )
      .get() as BoardRow | undefined;
    return row ? this.hydrate(row) : null;
  }

  create(board: Board): Board {
    const insert = this.db.transaction((value: Board) => {
      this.db
        .prepare(
          `INSERT INTO boards(id, name, is_default, layout_version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          value.id,
          value.name,
          value.isDefault ? 1 : 0,
          value.layoutVersion,
          value.createdAt,
          value.updatedAt,
        );
      this.replaceItems(value.id, value.items);
    });

    insert(board);
    return this.requireBoard(board.id);
  }

  rename(id: string, name: string, updatedAt: string): Board | null {
    const result = this.db
      .prepare('UPDATE boards SET name = ?, updated_at = ? WHERE id = ?')
      .run(name, updatedAt, id);
    return result.changes > 0 ? this.requireBoard(id) : null;
  }

  updateLayout(
    id: string,
    layoutVersion: Board['layoutVersion'],
    items: BoardItem[],
    updatedAt: string,
  ): Board | null {
    if (!this.findById(id)) return null;

    const update = this.db.transaction(() => {
      this.db
        .prepare('UPDATE boards SET layout_version = ?, updated_at = ? WHERE id = ?')
        .run(layoutVersion, updatedAt, id);
      this.replaceItems(id, items);
    });
    update();
    return this.requireBoard(id);
  }

  select(id: string): void {
    this.db
      .prepare(
        `INSERT INTO board_state(singleton, active_board_id)
         VALUES (1, ?)
         ON CONFLICT(singleton) DO UPDATE SET active_board_id = excluded.active_board_id`,
      )
      .run(id);
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM boards WHERE id = ?').run(id).changes > 0;
  }

  private replaceItems(boardId: string, items: BoardItem[]): void {
    this.db.prepare('DELETE FROM board_items WHERE board_id = ?').run(boardId);
    const insert = this.db.prepare(
      `INSERT INTO board_items(board_id, flow_id, position, collapsed, size)
       VALUES (?, ?, ?, ?, ?)`,
    );
    items.forEach((item, position) => {
      insert.run(boardId, item.flowId, position, item.collapsed ? 1 : 0, item.size);
    });
  }

  private hydrate(row: BoardRow): Board {
    if (row.layout_version !== BOARD_LAYOUT_VERSION) {
      throw new Error(`Unsupported board layout version: ${row.layout_version}`);
    }

    const itemRows = this.db
      .prepare(
        `SELECT flow_id, collapsed, size
         FROM board_items
         WHERE board_id = ?
         ORDER BY position ASC`,
      )
      .all(row.id) as BoardItemRow[];
    const items = itemRows.map<BoardItem>((item) => {
      if (!isBoardItemSize(item.size)) throw new Error(`Unsupported board item size: ${item.size}`);
      return {
        flowId: item.flow_id,
        collapsed: item.collapsed === 1,
        size: item.size,
      };
    });

    return {
      id: row.id,
      name: row.name,
      isDefault: row.is_default === 1,
      layoutVersion: BOARD_LAYOUT_VERSION,
      items,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private requireBoard(id: string): Board {
    const board = this.findById(id);
    if (!board) throw new Error(`Board ${id} disappeared during persistence`);
    return board;
  }
}
