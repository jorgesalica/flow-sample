import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BOARD_LAYOUT_VERSION, type BoardItem, type BoardLayoutUpdateRequest } from '@flows/shared';
import { SQLiteBoardRepository } from '../../src/backend/repository';
import { BoardService, DEFAULT_BOARD_ID } from '../../src/backend/service';
import {
  BoardConflictError,
  BoardNotFoundError,
  BoardValidationError,
} from '../../src/domain/errors';

describe('BoardService', () => {
  let database: Database.Database;
  let repository: SQLiteBoardRepository;
  let service: BoardService;
  let idSequence: number;
  let timeSequence: number;

  beforeEach(() => {
    database = new Database(':memory:');
    repository = new SQLiteBoardRepository(database);
    idSequence = 0;
    timeSequence = 0;
    service = new BoardService(repository, {
      createId: () => `id_${++idSequence}`,
      now: () => `2026-07-21T00:00:0${timeSequence++}.000Z`,
    });
  });

  afterEach(() => database.close());

  it('bootstraps and selects one protected default board', () => {
    const snapshot = service.snapshot();

    expect(snapshot.boards).toHaveLength(1);
    expect(snapshot.activeBoard).toMatchObject({ id: DEFAULT_BOARD_ID, isDefault: true });
  });

  it('creates, trims, and selects a named board', () => {
    const snapshot = service.create({
      name: '  Research  ',
      items: [{ flowId: ' spotify ', collapsed: false, size: 'compact' }],
    });

    expect(snapshot.activeBoard).toMatchObject({ id: 'board_id_1', name: 'Research' });
    expect(snapshot.activeBoard.items[0]?.flowId).toBe('spotify');
    expect(snapshot.boards).toHaveLength(2);
  });

  it('renames, updates, and selects boards', () => {
    const first = service.create({ name: 'First' }).activeBoard;
    const second = service.create({ name: 'Second' }).activeBoard;

    expect(
      service.rename(first.id, 'Renamed').boards.find((board) => board.id === first.id)?.name,
    ).toBe('Renamed');
    expect(
      service
        .updateLayout(first.id, {
          layoutVersion: BOARD_LAYOUT_VERSION,
          items: [{ flowId: 'chat-flow', collapsed: true, size: 'wide' }],
        })
        .boards.find((board) => board.id === first.id)?.items,
    ).toEqual([{ flowId: 'chat-flow', collapsed: true, size: 'wide' }]);
    expect(service.select(second.id).activeBoard.id).toBe(second.id);
  });

  it('deletes the active named board and recovers to default', () => {
    const named = service.create({ name: 'Temporary' }).activeBoard;

    const snapshot = service.delete(named.id);

    expect(snapshot.activeBoard.id).toBe(DEFAULT_BOARD_ID);
    expect(snapshot.boards.map((board) => board.id)).toEqual([DEFAULT_BOARD_ID]);
  });

  it('protects default deletion and rejects missing boards', () => {
    expect(() => service.delete(DEFAULT_BOARD_ID)).toThrow(BoardConflictError);
    expect(() => service.select('missing')).toThrow(BoardNotFoundError);
    expect(() => service.rename('missing', 'Name')).toThrow(BoardNotFoundError);
  });

  it('rejects empty, long, and duplicate names', () => {
    expect(() => service.create({ name: '   ' })).toThrow(BoardValidationError);
    expect(() => service.create({ name: 'x'.repeat(81) })).toThrow(BoardValidationError);
    service.create({ name: 'Research' });
    expect(() => service.create({ name: 'research' })).toThrow(BoardConflictError);
  });

  it('rejects duplicate, empty, oversized, and unsupported layout items', () => {
    expect(() =>
      service.updateLayout(DEFAULT_BOARD_ID, {
        layoutVersion: BOARD_LAYOUT_VERSION,
        items: [
          { flowId: 'spotify', collapsed: false, size: 'compact' },
          { flowId: 'spotify', collapsed: true, size: 'wide' },
        ],
      }),
    ).toThrow(BoardValidationError);
    expect(() =>
      service.updateLayout(DEFAULT_BOARD_ID, {
        layoutVersion: BOARD_LAYOUT_VERSION,
        items: [{ flowId: ' ', collapsed: false, size: 'compact' }],
      }),
    ).toThrow(BoardValidationError);
    expect(() =>
      service.updateLayout(DEFAULT_BOARD_ID, {
        layoutVersion: BOARD_LAYOUT_VERSION,
        items: Array.from({ length: 101 }, (_, index) => ({
          flowId: `flow_${index}`,
          collapsed: false,
          size: 'compact' as const,
        })),
      }),
    ).toThrow(BoardValidationError);

    const invalidItems = [
      { flowId: 'spotify', collapsed: false, size: 'huge' },
    ] as unknown as BoardItem[];
    expect(() =>
      service.updateLayout(DEFAULT_BOARD_ID, {
        layoutVersion: BOARD_LAYOUT_VERSION,
        items: invalidItems,
      }),
    ).toThrow(BoardValidationError);
  });

  it('rejects unsupported layout versions at the service boundary', () => {
    const invalid = {
      layoutVersion: 2,
      items: [],
    } as unknown as BoardLayoutUpdateRequest;

    expect(() => service.updateLayout(DEFAULT_BOARD_ID, invalid)).toThrow(BoardValidationError);
  });
});
