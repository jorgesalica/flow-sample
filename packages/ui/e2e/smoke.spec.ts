import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
    test('landing page loads correctly', async ({ page }) => {
        await page.goto('/');

        // Check page title or main heading
        await expect(page.locator('h1')).toBeVisible();

        // Check for Spotify Flow card
        await expect(page.getByText('Spotify Flow')).toBeVisible();
    });

    test('can navigate to Spotify Flow page', async ({ page }) => {
        await page.goto('/');

        // Click on Spotify Flow card/link
        await page.getByText('Spotify Flow').click();

        // Wait for navigation
        await page.waitForURL('**/#/spotify');

        // Verify we're on the Spotify Flow page
        await expect(page.locator('h1')).toContainText('Spotify');
    });

    test('Spotify Flow page shows track grid or loading state', async ({ page }) => {
        await page.goto('/#/spotify');

        // Wait for the page to load
        await page.waitForLoadState('networkidle');

        // Should show either tracks or a "Sync" button
        const hasContent = await page.locator('[data-testid="track-card"], button:has-text("Sync")').first().isVisible().catch(() => false);

        expect(hasContent || await page.getByText('Sync').isVisible()).toBeTruthy();
    });
});
