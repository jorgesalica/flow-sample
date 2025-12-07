import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('landing page loads correctly', async ({ page }) => {
    await page.goto('/');

    // Check page title or main heading
    await expect(page.locator('h1')).toBeVisible();

    // Check for Spotify Flow card
    await expect(page.getByText('Spotify Flow')).toBeVisible();
  });
});
