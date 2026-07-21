import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOARD_LAYOUT_VERSION, type BoardsSnapshot } from '@flows/shared';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  rename: vi.fn(),
  save: vi.fn(),
  select: vi.fn(),
  remove: vi.fn(),
  route: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock('@lib/client', () => {
  const boards = Object.assign(
    (params: { id: string }) => {
      mocks.route(params);
      return {
        patch: mocks.rename,
        delete: mocks.remove,
        layout: { put: mocks.save },
        select: { post: mocks.select },
      };
    },
    { post: mocks.create }
  );
  return { api: { api: { boards } } };
});

vi.mock('@lib/invalidate', () => ({ invalidateData: mocks.invalidate }));

import { createNamedBoard, deleteBoard, renameBoard, saveBoardLayout, selectBoard } from './api';

const board = {
  id: 'default',
  name: 'My Board',
  isDefault: true,
  layoutVersion: BOARD_LAYOUT_VERSION,
  items: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const snapshot: BoardsSnapshot = { boards: [board], activeBoard: board };

describe('board Eden API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invalidate.mockResolvedValue(undefined);
  });

  it('creates a board with the current layout contract and invalidates the loader', async () => {
    mocks.create.mockResolvedValue({ data: snapshot, error: null });
    const items = [{ flowId: 'spotify', collapsed: false, size: 'compact' as const }];

    await expect(createNamedBoard('Research', items)).resolves.toBe(snapshot);
    expect(mocks.create).toHaveBeenCalledWith({
      name: 'Research',
      layoutVersion: BOARD_LAYOUT_VERSION,
      items,
    });
    expect(mocks.invalidate).toHaveBeenCalledWith('app:boards');
  });

  it('renames and selects through dynamic Eden routes', async () => {
    mocks.rename.mockResolvedValue({ data: snapshot, error: null });
    mocks.select.mockResolvedValue({ data: snapshot, error: null });

    await renameBoard('default', 'Renamed');
    await selectBoard('default');

    expect(mocks.route).toHaveBeenNthCalledWith(1, { id: 'default' });
    expect(mocks.rename).toHaveBeenCalledWith({ name: 'Renamed' });
    expect(mocks.route).toHaveBeenNthCalledWith(2, { id: 'default' });
    expect(mocks.select).toHaveBeenCalledOnce();
  });

  it('saves layouts and deletes through typed routes', async () => {
    mocks.save.mockResolvedValue({ data: snapshot, error: null });
    mocks.remove.mockResolvedValue({ data: snapshot, error: null });
    const items = [{ flowId: 'lyrics-flow', collapsed: true, size: 'wide' as const }];

    await saveBoardLayout('default', items);
    await deleteBoard('named');

    expect(mocks.save).toHaveBeenCalledWith({ layoutVersion: BOARD_LAYOUT_VERSION, items });
    expect(mocks.remove).toHaveBeenCalledOnce();
  });

  it.each([
    ['create', () => createNamedBoard('Name', []), mocks.create],
    ['rename', () => renameBoard('default', 'Name'), mocks.rename],
    ['save', () => saveBoardLayout('default', []), mocks.save],
    ['select', () => selectBoard('default'), mocks.select],
    ['delete', () => deleteBoard('named'), mocks.remove],
  ])('surfaces a backend %s error without invalidating', async (_name, action, request) => {
    request.mockResolvedValue({ data: null, error: { value: { error: 'Rejected' } } });

    await expect(action()).rejects.toThrow('Rejected');
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
