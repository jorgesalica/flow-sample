import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport Tests', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

    test('landing page is responsive on mobile', async ({ page }) => {
        await page.goto('/');

        // Title should still be visible
        await expect(page.locator('h1')).toBeVisible();

        // Spotify Flow card should be visible
        await expect(page.getByText('Spotify Flow')).toBeVisible();
    });

    test('Spotify Flow page works on mobile', async ({ page }) => {
        await page.goto('/#/spotify');
        await page.waitForLoadState('networkidle');

        // Header should be visible
        await expect(page.locator('h1')).toBeVisible();

        // Back link should be visible
        await expect(page.getByText('Back to Flows')).toBeVisible();
    });
});
