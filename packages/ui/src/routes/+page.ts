import type { BoardsSnapshot } from '@flows/shared';
import { createApiClient } from '@lib/client';
import { INVALIDATION } from '@lib/invalidation';
import type { PageLoad } from './$types';

export interface BoardPageData {
  snapshot: BoardsSnapshot | null;
}

export const load: PageLoad = async ({ depends, fetch }): Promise<BoardPageData> => {
  depends(INVALIDATION.BOARDS);
  const api = createApiClient(fetch);

  try {
    const { data, error } = await api.api.boards.get();
    if (error || !data || 'error' in data) return { snapshot: null };
    return { snapshot: data };
  } catch {
    return { snapshot: null };
  }
};
