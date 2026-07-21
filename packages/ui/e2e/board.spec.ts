import { expect, test, type Page, type Route } from '@playwright/test';
import type {
  Board,
  BoardCreateRequest,
  BoardLayoutUpdateRequest,
  BoardRenameRequest,
  BoardsSnapshot,
} from '@flows/shared';

const BOARD_LAYOUT_STORAGE_KEY = 'flow-sample:board-layout';
const BOARD_LAYOUT_MIGRATION_KEY = 'flow-sample:board-layout-migrated-v1';
const defaultOrder = ['spotify', 'trading', 'lyrics-flow', 'chat-flow', 'canvas-flow'];
const spotifyStats = {
  totalTracks: 42,
  totalGenres: 8,
  topGenres: [{ genre: 'rock', count: 12 }],
  decadeDistribution: { '2020s': 20 },
  yearRange: { oldest: 1998, newest: 2025 },
};
const lyricsStats = { total: 20, found: 12, notFound: 3, pending: 5 };

interface BoardApiController {
  getSnapshot: () => BoardsSnapshot;
  getLayoutUpdateCount: () => number;
}

function defaultBoard(): Board {
  return {
    id: 'default',
    name: 'My Board',
    isDefault: true,
    layoutVersion: 1,
    items: defaultOrder.map((flowId) => ({ flowId, collapsed: false, size: 'compact' })),
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
  };
}

async function installBoardApi(page: Page): Promise<BoardApiController> {
  let sequence = 0;
  let layoutUpdateCount = 0;
  const initialBoard = defaultBoard();
  let snapshot: BoardsSnapshot = { boards: [initialBoard], activeBoard: initialBoard };

  function respond(route: Route, body: unknown, status = 200): Promise<void> {
    return route.fulfill({ status, json: body });
  }

  function updateBoard(updated: Board): void {
    const boards = snapshot.boards.map((board) => (board.id === updated.id ? updated : board));
    snapshot = {
      boards,
      activeBoard: snapshot.activeBoard.id === updated.id ? updated : snapshot.activeBoard,
    };
  }

  await page.route('**/api/boards**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path === '/api/boards' && method === 'GET') {
      await respond(route, snapshot);
      return;
    }

    if (path === '/api/boards' && method === 'POST') {
      const input = request.postDataJSON() as BoardCreateRequest;
      const timestamp = new Date(Date.UTC(2026, 6, 21, 0, 0, ++sequence)).toISOString();
      const board: Board = {
        id: `board-${sequence}`,
        name: input.name,
        isDefault: false,
        layoutVersion: input.layoutVersion ?? 1,
        items: input.items ?? [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      snapshot = { boards: [...snapshot.boards, board], activeBoard: board };
      await respond(route, snapshot, 201);
      return;
    }

    const match = path.match(/^\/api\/boards\/([^/]+)(?:\/(layout|select))?$/);
    if (!match) {
      await respond(route, { error: 'Not found' }, 404);
      return;
    }

    const id = decodeURIComponent(match[1] ?? '');
    const action = match[2];
    const board = snapshot.boards.find((candidate) => candidate.id === id);
    if (!board) {
      await respond(route, { error: 'Board not found' }, 404);
      return;
    }

    if (!action && method === 'PATCH') {
      const input = request.postDataJSON() as BoardRenameRequest;
      updateBoard({ ...board, name: input.name, updatedAt: new Date().toISOString() });
      await respond(route, snapshot);
      return;
    }

    if (action === 'layout' && method === 'PUT') {
      const input = request.postDataJSON() as BoardLayoutUpdateRequest;
      layoutUpdateCount += 1;
      updateBoard({
        ...board,
        layoutVersion: input.layoutVersion,
        items: input.items,
        updatedAt: new Date().toISOString(),
      });
      await respond(route, snapshot);
      return;
    }

    if (action === 'select' && method === 'POST') {
      snapshot = { ...snapshot, activeBoard: board };
      await respond(route, snapshot);
      return;
    }

    if (!action && method === 'DELETE' && !board.isDefault) {
      const boards = snapshot.boards.filter((candidate) => candidate.id !== id);
      const activeBoard =
        snapshot.activeBoard.id === id
          ? (boards.find((candidate) => candidate.isDefault) ?? boards[0])
          : snapshot.activeBoard;
      if (!activeBoard) {
        await respond(route, { error: 'Default board missing' }, 500);
        return;
      }
      snapshot = { boards, activeBoard };
      await respond(route, snapshot);
      return;
    }

    await respond(route, { error: 'Unsupported board operation' }, 422);
  });

  return {
    getSnapshot: () => snapshot,
    getLayoutUpdateCount: () => layoutUpdateCount,
  };
}

async function openBoard(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-board-id]')).toHaveCount(defaultOrder.length);
}

async function waitForLayoutSave(page: Page): Promise<void> {
  await expect(page.getByText('Saving', { exact: true })).toHaveCount(0);
}

async function boardOrder(page: Page): Promise<string[]> {
  return page
    .locator('[data-board-id]')
    .evaluateAll((items) => items.map((item) => item.getAttribute('data-board-id') ?? ''));
}

test.describe('Named boards', () => {
  test('renders representative live summary and expansion contracts', async ({ page }) => {
    await installBoardApi(page);
    await page.route('**/api/spotify/stats', (route) => route.fulfill({ json: spotifyStats }));
    await page.route('**/api/lyrics/stats', (route) => route.fulfill({ json: lyricsStats }));
    await openBoard(page);

    const spotifyCard = page.locator('[data-board-id="spotify"]');
    const lyricsCard = page.locator('[data-board-id="lyrics-flow"]');
    await expect(spotifyCard.getByRole('region', { name: 'Library snapshot' })).toBeVisible();
    await expect(spotifyCard.getByText('Top genre')).toBeVisible();
    await expect(spotifyCard.getByText('rock')).toBeVisible();
    await expect(lyricsCard.getByRole('region', { name: 'Lyrics coverage' })).toBeVisible();
    await expect(lyricsCard.getByText('Coverage', { exact: true })).toBeVisible();
    await expect(lyricsCard.getByText('60%')).toBeVisible();
  });

  test('keeps the previous summary as stale when refresh fails', async ({ page }) => {
    await installBoardApi(page);
    let failSpotifyRefresh = false;
    await page.route('**/api/spotify/stats', (route) =>
      failSpotifyRefresh
        ? route.fulfill({ status: 503, json: { error: 'unavailable' } })
        : route.fulfill({ json: spotifyStats })
    );
    await openBoard(page);

    const spotifyCard = page.locator('[data-board-id="spotify"]');
    await expect(spotifyCard.getByRole('region', { name: 'Library snapshot' })).toBeVisible();
    await expect(spotifyCard.getByText('42', { exact: true })).toBeVisible();
    const refresh = page.getByRole('button', { name: 'Refresh summaries' });
    await expect(refresh).toBeEnabled();

    failSpotifyRefresh = true;
    await refresh.click();

    await expect(spotifyCard.getByText('Stale')).toBeVisible();
    await expect(spotifyCard.getByText('42', { exact: true })).toBeVisible();
    await expect(spotifyCard.getByRole('status')).toContainText(
      'Refresh failed. Showing the previous summary.'
    );
  });

  test('keyboard controls persist order, collapsed state, size, and reset', async ({ page }) => {
    await installBoardApi(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openBoard(page);

    const moveSpotifyLater = page.getByRole('button', { name: 'Move Spotify Flow later' });
    await moveSpotifyLater.focus();
    await page.keyboard.press('Enter');
    await expect
      .poll(() => boardOrder(page))
      .toEqual(['trading', 'spotify', 'lyrics-flow', 'chat-flow', 'canvas-flow']);
    await waitForLayoutSave(page);

    await page.getByRole('combobox', { name: 'Size for Lyrics Flow' }).selectOption('wide');
    await waitForLayoutSave(page);
    await page.getByRole('button', { name: 'Collapse Text Canvas' }).click();
    await waitForLayoutSave(page);

    await page.reload();
    await expect(page.locator('[data-board-id]')).toHaveCount(defaultOrder.length);
    expect(await boardOrder(page)).toEqual([
      'trading',
      'spotify',
      'lyrics-flow',
      'chat-flow',
      'canvas-flow',
    ]);
    await expect(page.locator('[data-board-id="lyrics-flow"]')).toHaveAttribute(
      'data-size',
      'wide'
    );
    await expect(page.locator('[data-board-id="canvas-flow"]')).toHaveAttribute(
      'data-collapsed',
      'true'
    );
    await expect(page.getByRole('button', { name: 'Expand Text Canvas' })).toBeVisible();

    await page.getByRole('button', { name: 'Reset layout' }).click();
    await waitForLayoutSave(page);
    await expect.poll(() => boardOrder(page)).toEqual(defaultOrder);
    await expect(page.locator('[data-size="compact"]')).toHaveCount(defaultOrder.length);
    await expect(page.locator('[data-collapsed="false"]')).toHaveCount(defaultOrder.length);
  });

  test('drag and drop reorders registered flows and persists the result', async ({ page }) => {
    await installBoardApi(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openBoard(page);

    await page
      .locator('[data-board-id="spotify"]')
      .dragTo(page.locator('[data-board-id="canvas-flow"]'));

    await expect
      .poll(() => boardOrder(page))
      .toEqual(['trading', 'lyrics-flow', 'chat-flow', 'canvas-flow', 'spotify']);
    await waitForLayoutSave(page);
    await page.reload();
    await expect
      .poll(() => boardOrder(page))
      .toEqual(['trading', 'lyrics-flow', 'chat-flow', 'canvas-flow', 'spotify']);
  });

  test('creates, selects, renames, and deletes an isolated board', async ({ page }) => {
    await installBoardApi(page);
    await openBoard(page);

    await page.getByRole('button', { name: 'New board' }).click();
    await page.getByRole('textbox', { name: 'Board name' }).fill('Writing');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('combobox', { name: 'Active board' })).toHaveValue('board-1');
    await expect(page.getByRole('option', { name: 'Writing' })).toBeAttached();

    await page.getByRole('button', { name: 'Rename board' }).click();
    await page.getByRole('textbox', { name: 'Board name' }).fill('Drafts');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('option', { name: 'Drafts' })).toBeAttached();

    await page.getByRole('combobox', { name: 'Active board' }).selectOption('default');
    await expect(page.getByRole('button', { name: 'Delete board' })).toBeDisabled();
    await page.getByRole('combobox', { name: 'Active board' }).selectOption('board-1');
    await page.getByRole('button', { name: 'Delete board' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete board' })).toContainText(
      'Delete Drafts?'
    );
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByRole('combobox', { name: 'Active board' })).toHaveValue('default');
    await expect(page.getByRole('option', { name: 'Drafts' })).toHaveCount(0);
  });

  test('migrates the v1 local layout once and clears legacy storage', async ({ page }) => {
    const boards = await installBoardApi(page);
    await page.addInitScript(
      ({ layoutKey, migrationKey }) => {
        if (window.localStorage.getItem(migrationKey) !== null) return;
        window.localStorage.setItem(
          layoutKey,
          JSON.stringify({
            version: 1,
            items: [
              { id: 'trading', collapsed: true, size: 'wide' },
              { id: 'spotify', collapsed: false, size: 'compact' },
              { id: 'lyrics-flow', collapsed: false, size: 'compact' },
              { id: 'chat-flow', collapsed: false, size: 'compact' },
              { id: 'canvas-flow', collapsed: false, size: 'compact' },
            ],
          })
        );
      },
      { layoutKey: BOARD_LAYOUT_STORAGE_KEY, migrationKey: BOARD_LAYOUT_MIGRATION_KEY }
    );

    await openBoard(page);

    await expect.poll(() => boards.getLayoutUpdateCount()).toBe(1);
    await expect
      .poll(() => boardOrder(page))
      .toEqual(['trading', 'spotify', 'lyrics-flow', 'chat-flow', 'canvas-flow']);
    await expect(page.locator('[data-board-id="trading"]')).toHaveAttribute(
      'data-collapsed',
      'true'
    );
    const storage = await page.evaluate(
      ({ layoutKey, migrationKey }) => ({
        layout: window.localStorage.getItem(layoutKey),
        migration: window.localStorage.getItem(migrationKey),
      }),
      { layoutKey: BOARD_LAYOUT_STORAGE_KEY, migrationKey: BOARD_LAYOUT_MIGRATION_KEY }
    );
    expect(storage).toEqual({ layout: null, migration: '1' });
    expect(boards.getSnapshot().activeBoard.items[0]?.flowId).toBe('trading');
  });

  test('mobile layout stays usable and restores preferences', async ({ page }) => {
    await installBoardApi(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await openBoard(page);

    const itemBounds = await page.locator('[data-board-id]').evaluateAll((items) =>
      items.map((item) => {
        const bounds = item.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, width: bounds.width };
      })
    );
    for (const bounds of itemBounds) {
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(375);
      expect(bounds.width).toBeGreaterThan(0);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
    ).toBe(false);

    await page.getByRole('button', { name: 'Collapse Spotify Flow' }).click();
    await waitForLayoutSave(page);
    await page.getByRole('combobox', { name: 'Size for Trading Bot' }).selectOption('standard');
    await waitForLayoutSave(page);
    await page.reload();

    await expect(page.getByRole('button', { name: 'Expand Spotify Flow' })).toBeVisible();
    await expect(page.locator('[data-board-id="trading"]')).toHaveAttribute(
      'data-size',
      'standard'
    );
    await expect(page.locator('[data-board-id="spotify"] a[href="/spotify"]')).toBeVisible();
  });
});
