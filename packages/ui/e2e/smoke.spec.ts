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

test.describe('Navigation Tests', () => {
    test('can navigate back to landing from Spotify Flow', async ({ page }) => {
        await page.goto('/#/spotify');

        // Click back link
        await page.getByText('Back to Flows').click();

        // Should be on landing
        await page.waitForURL('**/#/');
        await expect(page.getByText('Spotify Flow')).toBeVisible();
    });
});

test.describe('Search Tests', () => {
    test('search bar is visible on Spotify Flow page', async ({ page }) => {
        await page.goto('/#/spotify');
        await page.waitForLoadState('networkidle');

        // Search input should be visible
        const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
        await expect(searchInput).toBeVisible();
    });

    test('can type in search bar', async ({ page }) => {
        await page.goto('/#/spotify');
        await page.waitForLoadState('networkidle');

        // Find and type in search
        const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
        await searchInput.fill('rock');

        // Verify the input value
        await expect(searchInput).toHaveValue('rock');
    });
});

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
