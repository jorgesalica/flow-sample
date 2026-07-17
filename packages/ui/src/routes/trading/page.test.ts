import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  StatusResponse,
  CandlesResponse,
  InsightResponse,
  TradingPageData,
} from '@lib/flows/trading/types';
import type { Candle, AdvisorNote } from '@flows/shared';

// --- Mock the network edge (typed Eden client). Never hit a real backend. ---
// `vi.hoisted` lets the mock fns exist before the hoisted vi.mock factory runs.
const { statusGet, candlesGet, insightGet, createApiClient } = vi.hoisted(() => ({
  statusGet: vi.fn(),
  candlesGet: vi.fn(),
  insightGet: vi.fn(),
  createApiClient: vi.fn(),
}));

vi.mock('@lib/client', () => {
  const client = {
    api: {
      trading: {
        status: { get: statusGet },
        candles: { get: candlesGet },
        insight: { get: insightGet },
      },
    },
  };
  return {
    createApiClient: (requestFetch: typeof fetch) => {
      createApiClient(requestFetch);
      return client;
    },
  };
});

import { load } from './+page';

// Minimal SvelteKit load event — the trading loader reads nothing off it.
const requestFetch = vi.fn();
const event = { fetch: requestFetch } as unknown as Parameters<typeof load>[0];

// --- Fixtures (fixed, deterministic) ---------------------------------------
function statusFixture(): StatusResponse {
  return {
    trading: {
      isRunning: true,
      symbol: 'BTCUSDT',
      interval: '1m',
      lastCandle: null,
      candleCount: 1234,
      connectedAt: '2023-11-14T22:13:20.000Z',
    },
    advisor: { isEnabled: true, lastInsightAt: '2023-11-14', insightCount: 3 },
  };
}

function makeCandle(overrides: Partial<Candle> = {}): Candle {
  return {
    symbol: 'BTCUSDT',
    interval: '1m',
    openTime: 1_700_000_000_000,
    closeTime: 1_700_000_059_999,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 12.5,
    isClosed: true,
    ...overrides,
  };
}

function makeNote(overrides: Partial<AdvisorNote> = {}): AdvisorNote {
  return {
    title: 'BTC Breakout Setup',
    sentiment_bias: 'LONG',
    regime_context: 'Strong trending regime',
    scenario_bullish: 'Breaks above resistance',
    scenario_bearish: 'Loses key support',
    mentor_tip: 'Wait for confirmation',
    reasoning_key_factors: ['Hurst > 0.6'],
    confidence_score: 78,
    ...overrides,
  };
}

beforeEach(() => {
  statusGet.mockReset();
  candlesGet.mockReset();
  insightGet.mockReset();
  createApiClient.mockReset();
  requestFetch.mockReset();
});

describe('trading loader — happy path', () => {
  it('returns the trading/advisor status, candles and latest insight', async () => {
    const candle = makeCandle();
    const note = makeNote();
    statusGet.mockResolvedValue({ data: statusFixture(), error: null });
    candlesGet.mockResolvedValue({
      data: { candles: [candle] } as CandlesResponse,
      error: null,
    });
    insightGet.mockResolvedValue({
      data: { insight: note } as InsightResponse,
      error: null,
    });

    const data = (await load(event)) as TradingPageData;

    expect(createApiClient).toHaveBeenCalledWith(requestFetch);
    expect(data.trading?.isRunning).toBe(true);
    expect(data.trading?.candleCount).toBe(1234);
    expect(data.advisor?.isEnabled).toBe(true);
    expect(data.candles).toEqual([candle]);
    expect(data.insight?.title).toBe('BTC Breakout Setup');
  });

  it('requests 100 candles (the previous onMount default)', async () => {
    statusGet.mockResolvedValue({ data: statusFixture(), error: null });
    candlesGet.mockResolvedValue({ data: { candles: [] }, error: null });
    insightGet.mockResolvedValue({ data: {}, error: null });

    await load(event);

    expect(candlesGet).toHaveBeenCalledWith({ query: { limit: '100' } });
  });

  it('attaches debugContext onto the insight when present', async () => {
    statusGet.mockResolvedValue({ data: statusFixture(), error: null });
    candlesGet.mockResolvedValue({ data: { candles: [] }, error: null });
    insightGet.mockResolvedValue({
      data: { insight: makeNote(), debugContext: { foo: 'bar' } } as InsightResponse,
      error: null,
    });

    const data = (await load(event)) as TradingPageData;

    expect(data.insight?._debugContext).toEqual({ foo: 'bar' });
  });
});

describe('trading loader — absence & defaults', () => {
  it('falls back to nulls/empties when payloads are missing keys', async () => {
    statusGet.mockResolvedValue({ data: {}, error: null });
    candlesGet.mockResolvedValue({ data: {}, error: null });
    insightGet.mockResolvedValue({ data: {}, error: null });

    const data = (await load(event)) as TradingPageData;

    expect(data.trading).toBeNull();
    expect(data.advisor).toBeNull();
    expect(data.candles).toEqual([]);
    expect(data.insight).toBeNull();
  });
});

describe('trading loader — error handling', () => {
  it('returns null trading/advisor when the status request errors', async () => {
    statusGet.mockResolvedValue({ data: null, error: { status: 500 } });
    candlesGet.mockResolvedValue({ data: { candles: [makeCandle()] }, error: null });
    insightGet.mockResolvedValue({ data: { insight: makeNote() }, error: null });

    const data = (await load(event)) as TradingPageData;

    expect(data.trading).toBeNull();
    expect(data.advisor).toBeNull();
    // Independent fetches still resolve.
    expect(data.candles).toHaveLength(1);
    expect(data.insight).not.toBeNull();
  });

  it('returns empty candles when the candles request rejects (network down)', async () => {
    statusGet.mockResolvedValue({ data: statusFixture(), error: null });
    candlesGet.mockRejectedValue(new Error('ECONNREFUSED'));
    insightGet.mockResolvedValue({ data: { insight: makeNote() }, error: null });

    const data = (await load(event)) as TradingPageData;

    expect(data.candles).toEqual([]);
    expect(data.trading?.isRunning).toBe(true);
    expect(data.insight).not.toBeNull();
  });

  it('returns null insight when the insight request errors', async () => {
    statusGet.mockResolvedValue({ data: statusFixture(), error: null });
    candlesGet.mockResolvedValue({ data: { candles: [] }, error: null });
    insightGet.mockResolvedValue({ data: null, error: { status: 500 } });

    const data = (await load(event)) as TradingPageData;

    expect(data.insight).toBeNull();
  });

  it('does not throw and returns a coherent empty shape when everything fails', async () => {
    statusGet.mockRejectedValue(new Error('down'));
    candlesGet.mockRejectedValue(new Error('down'));
    insightGet.mockRejectedValue(new Error('down'));

    const data = await load(event);

    expect(data).toEqual({ trading: null, advisor: null, candles: [], insight: null });
  });
});
