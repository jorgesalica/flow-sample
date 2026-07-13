import { expect, test } from '@playwright/test';

const routes = [
  { path: '/', navigationName: null },
  { path: '/spotify', navigationName: 'Spotify' },
  { path: '/lyrics', navigationName: 'Lyrics' },
  { path: '/trading', navigationName: 'Trading' },
  { path: '/chat', navigationName: 'Chat' },
  { path: '/canvas', navigationName: 'Canvas' },
];

test('theme selection persists across reloads', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Fire theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fire');
  await expect(page.getByRole('button', { name: 'Fire theme' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fire');
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 667 },
]) {
  test(`shared shell fits every route on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();

      if (route.navigationName) {
        const activeLink = page
          .getByRole('navigation', { name: 'Primary navigation' })
          .getByRole('link', { name: route.navigationName, exact: true });
        await expect(activeLink).toHaveAttribute('aria-current', 'page');
        const isVisibleInRail = await activeLink.evaluate((element) => {
          const rail = element.closest('.app-navbar__scroll');
          if (!rail) return false;
          const linkRect = element.getBoundingClientRect();
          const railRect = rail.getBoundingClientRect();
          return linkRect.left >= railRect.left - 1 && linkRect.right <= railRect.right + 1;
        });
        expect(isVisibleInRail, `${route.path} should reveal its active navigation link`).toBe(
          true
        );
      }

      const hasPageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasPageOverflow, `${route.path} should not overflow at ${viewport.name}`).toBe(false);
      expect(
        await page.evaluate(() => window.scrollY),
        `${route.path} should open at the top`
      ).toBe(0);
    }
  });
}
