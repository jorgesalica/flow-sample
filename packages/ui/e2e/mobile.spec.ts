import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('landing page is responsive on mobile', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();
    await expect(page.getByText('Spotify Flow')).toBeVisible();
  });

  test('Spotify Flow page works on mobile', async ({ page }) => {
    await page.goto('/spotify');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Spotify Flow' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to flows' })).toBeVisible();
  });
});
