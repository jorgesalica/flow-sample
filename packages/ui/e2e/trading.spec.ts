import { expect, test, type Page } from '@playwright/test';

const candle = {
  symbol: 'BTCUSDT',
  interval: '1d',
  openTime: Date.UTC(2026, 0, 1),
  closeTime: Date.UTC(2026, 0, 2),
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 12,
  isClosed: true,
};

const insight = {
  title: '1D insight',
  sentiment_bias: 'LONG',
  regime_context: 'Trending market',
  scenario_bullish: 'Break resistance',
  scenario_bearish: 'Lose support',
  mentor_tip: 'Wait for candle confirmation',
  reasoning_key_factors: ['Hurst is elevated'],
  confidence_score: 72,
};

const analysis = {
  market_context: {
    symbol: 'BTCUSDT',
    timestamp: '2026-01-01T00:00:00.000Z',
    price: 105,
    price_change_24h_percent: '5.00%',
  },
  regime_analysis: {
    classification: 'TRENDING',
    hurst_exponent: '0.650',
    fractal_dimension: '1.350',
    interpretation: 'Trending',
  },
  fractal_structure: {
    nearest_resistance: 110,
    distance_to_resistance: '+4.76%',
    resistance_touch_count: 2,
    nearest_support: 90,
    distance_to_support: '-14.29%',
    support_touch_count: 3,
    active_nodes_count: 5,
  },
  candle_patterns: [],
  indicators: { rsi: '55.0', macd: 'N/A' },
};

async function mockTrading(page: Page, wizardBodies: Array<Record<string, unknown>>) {
  await page.addInitScript(() => {
    class StubEventSource {
      onerror: (() => void) | null = null;
      addEventListener(): void {}
      close(): void {}
    }
    Object.defineProperty(window, 'EventSource', { value: StubEventSource });
  });

  await page.route('**/api/trading/status', (route) =>
    route.fulfill({
      json: {
        success: true,
        trading: {
          isRunning: false,
          symbol: 'BTCUSDT',
          interval: '1m',
          lastCandle: null,
          candleCount: 0,
          connectedAt: null,
        },
        advisor: { isEnabled: false, lastInsightAt: null, insightCount: 0 },
      },
    })
  );
  await page.route('**/api/trading/candles**', (route) =>
    route.fulfill({ json: { success: true, count: 1, candles: [candle] } })
  );
  await page.route(/\/api\/trading\/insight(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        success: true,
        insight: null,
        debugContext: null,
        timestamp: null,
        regime: null,
        tokensUsed: null,
        latencyMs: null,
      },
    })
  );
  await page.route('**/api/trading/klines**', (route) => {
    const interval = new URL(route.request().url()).searchParams.get('interval') ?? '1d';
    return route.fulfill({
      json: {
        success: true,
        count: 1,
        symbol: 'BTCUSDT',
        interval,
        candles: [{ ...candle, interval }],
      },
    });
  });
  await page.route('**/api/trading/wizard/insight', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    wizardBodies.push(body);
    const stepLabel = typeof body.stepLabel === 'string' ? body.stepLabel : '1D';
    const interval = typeof body.interval === 'string' ? body.interval : '1d';
    return route.fulfill({
      json: {
        success: true,
        insight: { ...insight, title: `${stepLabel} insight` },
        analysis,
        meta: { interval, candleCount: 1, tokensUsed: 10, latencyMs: 20 },
      },
    });
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 667 },
]) {
  test(`trading wizard preserves cascade context on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const wizardBodies: Array<Record<string, unknown>> = [];
    await mockTrading(page, wizardBodies);

    await page.goto('/trading');
    await expect(page.getByRole('heading', { name: 'Trading Bot' })).toBeVisible();
    await page.getByRole('button', { name: 'Open wizard' }).click();
    await expect(page.getByRole('heading', { name: 'Cascade analysis wizard' })).toBeVisible();

    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.getByText('1D insight', { exact: true })).toBeVisible();
    await expect(page.getByText('TRENDING')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.getByText('4H insight', { exact: true })).toBeVisible();

    expect(wizardBodies).toHaveLength(2);
    expect(wizardBodies[0].previousInsights).toEqual([]);
    expect(wizardBodies[1].previousInsights).toEqual([
      { label: '1D', insight: { ...insight, title: '1D insight' } },
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
    ).toBe(false);
  });
}
