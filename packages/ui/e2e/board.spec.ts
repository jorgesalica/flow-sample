import { expect, test, type Page } from '@playwright/test';

const BOARD_LAYOUT_STORAGE_KEY = 'flow-sample:board-layout';
const defaultOrder = ['spotify', 'trading', 'lyrics-flow', 'chat-flow', 'canvas-flow'];

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
