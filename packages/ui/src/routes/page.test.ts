import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOARD_LAYOUT_VERSION, type BoardsSnapshot } from '@flows/shared';

const boardsGet = vi.fn();
const createApiClient = vi.fn();

vi.mock('@lib/client', () => ({
  createApiClient: (requestFetch: typeof fetch) => {
    createApiClient(requestFetch);
    return { api: { boards: { get: boardsGet } } };
  },
}));

import { load } from './+page';

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
const depends = vi.fn();
const requestFetch = vi.fn();
const event = { depends, fetch: requestFetch } as unknown as Parameters<typeof load>[0];

describe('root board loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the named-board snapshot with request-scoped fetch', async () => {
    boardsGet.mockResolvedValue({ data: snapshot, error: null });

    await expect(load(event)).resolves.toEqual({ snapshot });
    expect(depends).toHaveBeenCalledWith('app:boards');
    expect(createApiClient).toHaveBeenCalledWith(requestFetch);
  });

  it('returns a recoverable null snapshot for API and network failures', async () => {
    boardsGet.mockResolvedValueOnce({ data: null, error: { status: 500 } });
    await expect(load(event)).resolves.toEqual({ snapshot: null });

    boardsGet.mockRejectedValueOnce(new Error('offline'));
    await expect(load(event)).resolves.toEqual({ snapshot: null });
  });
});
