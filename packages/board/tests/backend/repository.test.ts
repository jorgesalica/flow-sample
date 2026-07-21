import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BOARD_LAYOUT_VERSION, type Board } from '@flows/shared';
import { SQLiteBoardRepository } from '../../src/backend/repository';

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: 'board_one',
    name: 'One',
    isDefault: false,
    layoutVersion: BOARD_LAYOUT_VERSION,
    items: [
      { flowId: 'spotify', collapsed: false, size: 'compact' },
      { flowId: 'lyrics-flow', collapsed: true, size: 'wide' },
    ],
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('SQLiteBoardRepository', () => {
  let database: Database.Database;
  let repository: SQLiteBoardRepository;

  beforeEach(() => {
    database = new Database(':memory:');
    repository = new SQLiteBoardRepository(database);
  });

  afterEach(() => database.close());

  it('persists and hydrates ordered board items', () => {
    const created = repository.create(makeBoard());

    expect(created.items.map((item) => item.flowId)).toEqual(['spotify', 'lyrics-flow']);
    expect(created.items[1]).toEqual({ flowId: 'lyrics-flow', collapsed: true, size: 'wide' });
    expect(repository.list()).toEqual([created]);
  });

  it('finds names case-insensitively and keeps the default first', () => {
    repository.create(makeBoard({ id: 'default', name: 'My Board', isDefault: true }));
    repository.create(makeBoard());

    expect(repository.findByName('one')?.id).toBe('board_one');
    expect(repository.findDefault()?.id).toBe('default');
    expect(repository.list().map((board) => board.id)).toEqual(['default', 'board_one']);
  });

  it('renames and atomically replaces a layout', () => {
    repository.create(makeBoard());

    expect(repository.rename('board_one', 'Renamed', '2026-07-21T01:00:00.000Z')).toMatchObject({
      name: 'Renamed',
      updatedAt: '2026-07-21T01:00:00.000Z',
    });
    expect(
      repository.updateLayout(
        'board_one',
        BOARD_LAYOUT_VERSION,
        [{ flowId: 'canvas-flow', collapsed: false, size: 'standard' }],
        '2026-07-21T02:00:00.000Z',
      ),
    ).toMatchObject({
      items: [{ flowId: 'canvas-flow', collapsed: false, size: 'standard' }],
      updatedAt: '2026-07-21T02:00:00.000Z',
    });
  });

  it('tracks active selection and clears it when that board is deleted', () => {
    repository.create(makeBoard());
    repository.select('board_one');

    expect(repository.findActive()?.id).toBe('board_one');
    expect(repository.delete('board_one')).toBe(true);
    expect(repository.findActive()).toBeNull();
    expect(repository.delete('missing')).toBe(false);
  });

  it('returns null for missing mutation targets', () => {
    expect(repository.findById('missing')).toBeNull();
    expect(repository.rename('missing', 'Name', '2026-07-21T00:00:00.000Z')).toBeNull();
    expect(
      repository.updateLayout('missing', BOARD_LAYOUT_VERSION, [], '2026-07-21T00:00:00.000Z'),
    ).toBeNull();
  });
});
