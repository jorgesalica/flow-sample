import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('landing page loads correctly', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();
    await expect(page.locator('[data-board-id]')).toHaveCount(5);
    await expect(page.getByText('Spotify Flow')).toBeVisible();
  });
});
