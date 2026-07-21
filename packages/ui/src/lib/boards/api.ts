import type { BoardItem, BoardsSnapshot } from '@flows/shared';
import { api } from '@lib/client';
import { invalidateData } from '@lib/invalidate';
import { INVALIDATION } from '@lib/invalidation';
import { BOARD_LAYOUT_VERSION } from '@lib/pages/board-layout';

function readBackendError(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('error' in value)) return undefined;
  return typeof value.error === 'string' ? value.error : undefined;
}

async function finishMutation(snapshot: BoardsSnapshot): Promise<BoardsSnapshot> {
  await invalidateData(INVALIDATION.BOARDS);
  return snapshot;
}

export async function createNamedBoard(name: string, items: BoardItem[]): Promise<BoardsSnapshot> {
  const { data, error } = await api.api.boards.post({
    name,
    layoutVersion: BOARD_LAYOUT_VERSION,
    items,
  });
  if (error || !data || 'error' in data) {
    throw new Error(readBackendError(error?.value) ?? 'Failed to create board');
  }
  return finishMutation(data);
}

export async function renameBoard(id: string, name: string): Promise<BoardsSnapshot> {
  const { data, error } = await api.api.boards({ id }).patch({ name });
  if (error || !data || 'error' in data) {
    throw new Error(readBackendError(error?.value) ?? 'Failed to rename board');
  }
  return finishMutation(data);
}

export async function saveBoardLayout(id: string, items: BoardItem[]): Promise<BoardsSnapshot> {
  const { data, error } = await api.api.boards({ id }).layout.put({
    layoutVersion: BOARD_LAYOUT_VERSION,
    items,
  });
  if (error || !data || 'error' in data) {
    throw new Error(readBackendError(error?.value) ?? 'Failed to save board layout');
  }
  return finishMutation(data);
}

export async function selectBoard(id: string): Promise<BoardsSnapshot> {
  const { data, error } = await api.api.boards({ id }).select.post();
  if (error || !data || 'error' in data) {
    throw new Error(readBackendError(error?.value) ?? 'Failed to select board');
  }
  return finishMutation(data);
}

export async function deleteBoard(id: string): Promise<BoardsSnapshot> {
  const { data, error } = await api.api.boards({ id }).delete();
  if (error || !data || 'error' in data) {
    throw new Error(readBackendError(error?.value) ?? 'Failed to delete board');
  }
  return finishMutation(data);
}
