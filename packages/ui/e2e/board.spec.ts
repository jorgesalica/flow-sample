import { expect, test, type Page } from '@playwright/test';

const BOARD_LAYOUT_STORAGE_KEY = 'flow-sample:board-layout';
const defaultOrder = ['spotify', 'trading', 'lyrics-flow', 'chat-flow', 'canvas-flow'];
const spotifyStats = {
  totalTracks: 42,
  totalGenres: 8,
  topGenres: [{ genre: 'rock', count: 12 }],
  decadeDistribution: { '2020s': 20 },
  yearRange: { oldest: 1998, newest: 2025 },
};
const lyricsStats = { total: 20, found: 12, notFound: 3, pending: 5 };

async function openCleanBoard(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((key) => window.localStorage.removeItem(key), BOARD_LAYOUT_STORAGE_KEY);
  await page.reload();
  await expect(page.locator('[data-board-id]')).toHaveCount(defaultOrder.length);
}

async function boardOrder(page: Page): Promise<string[]> {
  return page
    .locator('[data-board-id]')
    .evaluateAll((items) => items.map((item) => item.getAttribute('data-board-id') ?? ''));
}

test.describe('Board v1', () => {
  test('renders representative live summary and expansion contracts', async ({ page }) => {
    await page.route('**/api/spotify/stats', (route) => route.fulfill({ json: spotifyStats }));
    await page.route('**/api/lyrics/stats', (route) => route.fulfill({ json: lyricsStats }));
    await openCleanBoard(page);

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
    let failSpotifyRefresh = false;
    await page.route('**/api/spotify/stats', (route) =>
      failSpotifyRefresh
        ? route.fulfill({ status: 503, json: { error: 'unavailable' } })
        : route.fulfill({ json: spotifyStats })
    );
    await page.goto('/');

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
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCleanBoard(page);

    const moveSpotifyLater = page.getByRole('button', { name: 'Move Spotify Flow later' });
    await moveSpotifyLater.focus();
    await page.keyboard.press('Enter');
    await expect
      .poll(() => boardOrder(page))
      .toEqual(['trading', 'spotify', 'lyrics-flow', 'chat-flow', 'canvas-flow']);

    await page.getByRole('combobox', { name: 'Size for Lyrics Flow' }).selectOption('wide');
    await page.getByRole('button', { name: 'Collapse Text Canvas' }).click();

    const savedLayout = await page.evaluate((key) => {
      const serialized = window.localStorage.getItem(key);
      return serialized ? (JSON.parse(serialized) as unknown) : null;
    }, BOARD_LAYOUT_STORAGE_KEY);
    expect(savedLayout).toMatchObject({ version: 1 });

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
    await expect.poll(() => boardOrder(page)).toEqual(defaultOrder);
    await expect(page.locator('[data-size="compact"]')).toHaveCount(defaultOrder.length);
    await expect(page.locator('[data-collapsed="false"]')).toHaveCount(defaultOrder.length);
  });

  test('drag and drop reorders registered flows and persists the result', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCleanBoard(page);

    await page
      .locator('[data-board-id="spotify"]')
      .dragTo(page.locator('[data-board-id="canvas-flow"]'));

    await expect
      .poll(() => boardOrder(page))
      .toEqual(['trading', 'lyrics-flow', 'chat-flow', 'canvas-flow', 'spotify']);
    await page.reload();
    await expect
      .poll(() => boardOrder(page))
      .toEqual(['trading', 'lyrics-flow', 'chat-flow', 'canvas-flow', 'spotify']);
  });

  test('mobile layout stays usable and restores preferences', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openCleanBoard(page);

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
    await page.getByRole('combobox', { name: 'Size for Trading Bot' }).selectOption('standard');
    await page.reload();

    await expect(page.getByRole('button', { name: 'Expand Spotify Flow' })).toBeVisible();
    await expect(page.locator('[data-board-id="trading"]')).toHaveAttribute(
      'data-size',
      'standard'
    );
    await expect(page.locator('[data-board-id="spotify"] a[href="/spotify"]')).toBeVisible();
  });
});
