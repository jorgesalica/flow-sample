import { expect, test, type Page } from '@playwright/test';

const track = {
  id: 'track-1',
  title: 'Test Song',
  artist: 'Test Artist',
  imageUrl: null,
  status: 'found',
};

const analysis = {
  id: 'canvas-1',
  sourceId: track.id,
  sourceType: 'track',
  sourceTextHash: 'hash',
  tokenAst: {
    totalTokens: 2,
    sections: [
      {
        id: 'section-1',
        type: 'Verse',
        lines: [
          [
            { id: 'token-1', text: 'Hello' },
            { id: 'token-2', text: 'world' },
          ],
        ],
      },
    ],
  },
  annotations: [],
  layers: [{ id: 'meaning', name: 'Meaning', icon: 'Insight', color: '#22d3ee' }],
  meta: { key: 'C major', bpm: 100, mood: 'Bright' },
  modelUsed: 'llama-3.3-70b-versatile',
  providerUsed: 'groq',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
};

async function mockLyricsCanvas(page: Page): Promise<void> {
  await page.route('**/api/lyrics/stats', (route) =>
    route.fulfill({ json: { total: 1, found: 1, notFound: 0, pending: 0 } })
  );
  await page.route('**/api/lyrics/tracks**', (route) => route.fulfill({ json: [track] }));
  await page.route('**/api/lyrics/track-1/canvas', (route) => route.fulfill({ json: analysis }));
  await page.route(/\/api\/lyrics\/track-1(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        trackId: track.id,
        plainLyrics: 'Hello world',
        syncedLyrics: null,
        status: 'found',
        interpretation: 'A short test interpretation.',
        fetchedAt: '2026-07-16T00:00:00.000Z',
      },
    })
  );
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 667 },
]) {
  test(`lyrics canvas deep-link and history are clean on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockLyricsCanvas(page);
    const runtimeProblems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning' || message.type() === 'error') {
        runtimeProblems.push(message.text());
      }
    });
    page.on('pageerror', (error) => runtimeProblems.push(error.message));

    await page.goto('/lyrics?canvasTrackId=track-1');

    await expect(page.getByRole('heading', { name: 'Canvas Analysis' })).toBeVisible();
    await expect(page.getByText('Hello')).toBeVisible();
    expect(runtimeProblems).toEqual([]);

    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    await expect(page).toHaveURL(/\/lyrics$/);
    await expect(page.getByRole('heading', { name: 'Recent Tracks' })).toBeVisible();

    await page.getByRole('button', { name: 'Open Canvas' }).click();
    await expect(page).toHaveURL(/\/lyrics\?canvasTrackId=track-1$/);
    await expect(page.getByRole('heading', { name: 'Canvas Analysis' })).toBeVisible();

    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasPageOverflow).toBe(false);
    expect(runtimeProblems).toEqual([]);
  });
}
