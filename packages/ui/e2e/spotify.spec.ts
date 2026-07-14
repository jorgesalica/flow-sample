import { test, expect } from '@playwright/test';

test.describe('Spotify Flow Page', () => {
  test('can navigate to Spotify Flow page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Open Spotify Flow' }).click();
    await page.waitForURL('**/spotify');
    await expect(page.getByRole('heading', { name: 'Spotify Flow' })).toBeVisible();
  });

  test('Spotify Flow page exposes the track region', async ({ page }) => {
    await page.goto('/spotify');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('region', { name: 'Spotify tracks' })).toBeVisible();
  });

  test('can navigate back to landing from Spotify Flow', async ({ page }) => {
    await page.goto('/spotify');

    await page.getByRole('link', { name: 'Back to flows' }).click();
    await page.waitForURL('**/');
    await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();
  });
});

test.describe('Search', () => {
  test('search bar is visible on Spotify Flow page', async ({ page }) => {
    await page.goto('/spotify');
    await page.waitForLoadState('networkidle');

    // Search input should be visible
    const searchInput = page.getByRole('searchbox');
    await expect(searchInput).toBeVisible();
  });

  test('can type in search bar', async ({ page }) => {
    await page.goto('/spotify');
    await page.waitForLoadState('networkidle');

    // Find and type in search
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('rock');

    // Verify the input value
    await expect(searchInput).toHaveValue('rock');
  });
});
