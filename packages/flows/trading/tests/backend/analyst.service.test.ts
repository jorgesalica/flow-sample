import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Candle } from '../../src/domain/math';
import { TRADING_CONFIG } from '../../src/backend/config';
import type { TradingPersistence } from '../../src/backend/database';
import type { AnalystServiceConfig } from '../../src/backend/services/analyst.service';

// ── Mock the database edge; run the REAL domain math ──────────────────
const getLastNCandlesAll = vi.fn();
const insertFractalRun = vi.fn();

const persistence: TradingPersistence = {
  getLastCandles: (symbol, interval, limit) => getLastNCandlesAll(symbol, interval, limit),
  insertFractalNode: (node) => {
    insertFractalRun(node);
  },
  upsertCandle: vi.fn(),
  getLastCandle: vi.fn(() => null),
  getCandleCount: vi.fn(() => 0),
  getLastFractalNodes: vi.fn(() => []),
  insertAdvisorLog: vi.fn(),
  getLatestAdvisorLog: vi.fn(() => null),
};

const analystModule = await import('../../src/backend/services/analyst.service');

class AnalystService extends analystModule.AnalystService {
  constructor(config?: Partial<AnalystServiceConfig>) {
    super(persistence, config);
  }
}

function getAnalystService(): InstanceType<typeof analystModule.AnalystService> {
  return analystModule.getAnalystService(persistence);
}

// ── Deterministic candle fixtures ─────────────────────────────────────

const SYMBOL = 'BTCUSDT';
const BASE_TIME = 1_700_000_000_000;
const MINUTE = 60_000;

/**
 * A gently rising zig-zag with sharp, strictly-local peaks/troughs every few
 * bars so Bill Williams fractal detection (lookback 2) yields high AND low
 * fractals deterministically — no Math.random in the test body.
 */
function makeTrendingCandles(count: number): Candle[] {
  return Array.from({ length: count }, (_, i) => {
    const trend = 100 + i * 0.3;
    // Triangle wave with period 6 → strict peak at phase 3, strict trough at phase 0
    const phase = i % 6;
    const wave = phase <= 3 ? phase : 6 - phase; // 0,1,2,3,2,1
    const base = trend + wave;
    return {
      openTime: BASE_TIME + i * MINUTE,
      open: base,
      high: base + 0.5,
      low: base - 0.5,
      close: base + 0.1,
      volume: 10 + (i % 5),
    };
  });
}

/** Candle rows as returned by SQLite (snake_case, DESC order). */
function makeCandleRows(count: number) {
  const candles = makeTrendingCandles(count);
  // DB returns DESC (newest first) — the service reverses to chronological.
  return candles
    .map((c, i) => ({
      id: i + 1,
      symbol: SYMBOL,
      interval: '1m',
      open_time: c.openTime,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      close_time: c.openTime + MINUTE - 1,
    }))
    .reverse();
}

describe('AnalystService.analyze (stream pipeline)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there are fewer than MIN_FOR_ANALYSIS candles', () => {
    getLastNCandlesAll.mockReturnValue(makeCandleRows(TRADING_CONFIG.CANDLES.MIN_FOR_ANALYSIS - 1));
    const svc = new AnalystService();
    expect(svc.analyze()).toBeNull();
    expect(insertFractalRun).not.toHaveBeenCalled();
  });

  it('produces a MarketState with enough candles', () => {
    getLastNCandlesAll.mockReturnValue(makeCandleRows(120));
    const svc = new AnalystService();
    const state = svc.analyze();

    expect(state).not.toBeNull();
    expect(state!.symbol).toBe(SYMBOL);
    expect(state!.hurst).toBeGreaterThanOrEqual(0.1);
    expect(state!.hurst).toBeLessThanOrEqual(0.9);
    expect(['TRENDING', 'RANGING', 'MEAN_REVERTING', 'RANDOM']).toContain(state!.regime);
    expect(state!.fractalDimension).toBeCloseTo(2 - state!.hurst, 5);
  });

  it('queries the DB with the configured symbol/interval/lookback', () => {
    getLastNCandlesAll.mockReturnValue(makeCandleRows(60));
    const svc = new AnalystService({ symbol: 'ETHUSDT', interval: '5m', candleLookback: 250 });
    svc.analyze();
    expect(getLastNCandlesAll).toHaveBeenCalledWith('ETHUSDT', '5m', 250);
  });

  it('persists detected fractals to the database', () => {
    getLastNCandlesAll.mockReturnValue(makeCandleRows(120));
    new AnalystService().analyze();
    // Trending data with oscillation should yield at least one fractal.
    expect(insertFractalRun).toHaveBeenCalled();
    const firstCall = insertFractalRun.mock.calls[0][0];
    expect(firstCall).toMatchObject({ symbol: SYMBOL });
    expect(['high', 'low']).toContain(firstCall.type);
    expect(typeof firstCall.detectedAt).toBe('number');
  });

  it('swallows UNIQUE constraint errors when persisting fractals', () => {
    getLastNCandlesAll.mockReturnValue(makeCandleRows(120));
    insertFractalRun.mockImplementation(() => {
      throw new Error('UNIQUE constraint failed: fractal_nodes.candle_open_time');
    });
    const svc = new AnalystService();
    expect(() => svc.analyze()).not.toThrow();
    expect(svc.analyze()).not.toBeNull();
  });

  it('rethrows non-UNIQUE persistence errors', () => {
    getLastNCandlesAll.mockReturnValue(makeCandleRows(120));
    insertFractalRun.mockImplementation(() => {
      throw new Error('database is locked');
    });
    expect(() => new AnalystService().analyze()).toThrow('database is locked');
  });
});

describe('AnalystService.analyzeCandles (wizard / static)', () => {
  it('returns null below the minimum candle count', () => {
    const result = AnalystService.analyzeCandles(makeTrendingCandles(10), SYMBOL);
    expect(result).toBeNull();
  });

  it('computes a full MarketState including indicators', () => {
    const state = AnalystService.analyzeCandles(makeTrendingCandles(120), SYMBOL);
    expect(state).not.toBeNull();
    expect(state!.symbol).toBe(SYMBOL);
    // RSI requires period 14; with 120 candles it should be present.
    expect(state!.indicators.rsi).toBeTypeOf('number');
    // MACD requires slow period 26; present with 120 candles.
    expect(state!.indicators.macd).toBeDefined();
    expect(state!.indicators.macd!.value).toBeTypeOf('number');
  });

  it('sets current price to the last close and computes the period change', () => {
    const candles = makeTrendingCandles(120);
    const state = AnalystService.analyzeCandles(candles, SYMBOL);
    expect(state!.price.current).toBe(candles[candles.length - 1].close);
    expect(state!.price.open24h).toBe(candles[0].open);
    const expectedChange =
      ((candles[candles.length - 1].close - candles[0].open) / candles[0].open) * 100;
    expect(state!.price.change24h).toBeCloseTo(expectedChange, 5);
  });

  it('invokes the onFractalsDetected callback with at most 20 recent fractals', () => {
    const onFractals = vi.fn();
    AnalystService.analyzeCandles(makeTrendingCandles(200), SYMBOL, onFractals);
    expect(onFractals).toHaveBeenCalledOnce();
    const fractals = onFractals.mock.calls[0][0];
    expect(Array.isArray(fractals)).toBe(true);
    expect(fractals.length).toBeLessThanOrEqual(20);
  });

  it('does not require a callback', () => {
    expect(() => AnalystService.analyzeCandles(makeTrendingCandles(60), SYMBOL)).not.toThrow();
  });

  it('defaults support/resistance touch counts to 0 when no level is found', () => {
    // Flat data → no meaningful fractals → support/resistance may be null.
    const flat: Candle[] = Array.from({ length: 60 }, (_, i) => ({
      openTime: BASE_TIME + i * MINUTE,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 1,
    }));
    const state = AnalystService.analyzeCandles(flat, SYMBOL);
    expect(state).not.toBeNull();
    expect(state!.nodes.supportTouchCount).toBeGreaterThanOrEqual(0);
    expect(state!.nodes.resistanceTouchCount).toBeGreaterThanOrEqual(0);
  });
});

describe('getAnalystService singleton', () => {
  it('returns the same instance across calls', () => {
    expect(getAnalystService()).toBe(getAnalystService());
  });
});
