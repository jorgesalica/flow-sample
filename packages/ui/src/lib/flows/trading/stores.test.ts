import { describe, it, expect, beforeEach } from 'vitest';
import type { Candle, FractalNode, AdvisorNote } from '@flows/shared';
import { tradingStore } from './stores.svelte';

// Fixed, deterministic fixtures (no Date.now / Math.random).
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
    title: 'Test Insight',
    sentiment_bias: 'LONG',
    regime_context: 'Trending up',
    scenario_bullish: 'Break resistance',
    scenario_bearish: 'Lose support',
    mentor_tip: 'Stay patient',
    reasoning_key_factors: ['Hurst > 0.5'],
    confidence_score: 72,
    ...overrides,
  };
}

// The store is a module-level singleton; reset it to a known baseline before
// each test so ordering is irrelevant.
beforeEach(() => {
  tradingStore.reset();
});

describe('trading store — initial contract', () => {
  it('tradingState starts stopped with BTCUSDT/1m defaults and no candle', () => {
    const state = tradingStore.tradingState;
    expect(state.isRunning).toBe(false);
    expect(state.symbol).toBe('BTCUSDT');
    expect(state.interval).toBe('1m');
    expect(state.lastCandle).toBeNull();
    expect(state.candleCount).toBe(0);
    expect(state.connectedAt).toBeNull();
  });

  it('advisorState starts disabled with zero insights', () => {
    const state = tradingStore.advisorState;
    expect(state.isEnabled).toBe(false);
    expect(state.lastInsightAt).toBeNull();
    expect(state.insightCount).toBe(0);
  });

  it('collection state starts empty and insight flags start falsy', () => {
    expect(tradingStore.candles).toEqual([]);
    expect(tradingStore.fractals).toEqual([]);
    expect(tradingStore.latestInsight).toBeNull();
    expect(tradingStore.isLoadingInsight).toBe(false);
  });
});

describe('trading store — set/update behavior', () => {
  it('setTradingState replaces the whole state object', () => {
    const candle = makeCandle({ close: 200 });
    tradingStore.setTradingState({
      isRunning: true,
      symbol: 'ETHUSDT',
      interval: '5m',
      lastCandle: candle,
      candleCount: 42,
      connectedAt: '2023-11-14T22:13:20.000Z',
    });
    const state = tradingStore.tradingState;
    expect(state.isRunning).toBe(true);
    expect(state.symbol).toBe('ETHUSDT');
    expect(state.lastCandle?.close).toBe(200);
    expect(state.candleCount).toBe(42);
  });

  it('updateAdvisorState toggles isEnabled without dropping other fields', () => {
    tradingStore.setAdvisorState({
      isEnabled: false,
      lastInsightAt: '2023-01-01',
      insightCount: 3,
    });
    tradingStore.updateAdvisorState((s) => ({ ...s, isEnabled: true }));
    const state = tradingStore.advisorState;
    expect(state.isEnabled).toBe(true);
    expect(state.lastInsightAt).toBe('2023-01-01');
    expect(state.insightCount).toBe(3);
  });

  it('setCandles holds an ordered list of candles', () => {
    const list = [makeCandle({ openTime: 1 }), makeCandle({ openTime: 2 })];
    tradingStore.setCandles(list);
    const stored = tradingStore.candles;
    expect(stored).toHaveLength(2);
    expect(stored[0].openTime).toBe(1);
    expect(stored[1].openTime).toBe(2);
  });

  it('appendClosedCandle mimics the rolling-window append used by the SSE handler', () => {
    tradingStore.setCandles([makeCandle({ openTime: 1 })]);
    tradingStore.appendClosedCandle(makeCandle({ openTime: 2 }));
    const stored = tradingStore.candles;
    expect(stored).toHaveLength(2);
    expect(stored.at(-1)?.openTime).toBe(2);
  });

  it('appendClosedCandle caps the rolling window at 100 candles', () => {
    // Seed 100 candles, then append one more — the oldest should drop off.
    const seed = Array.from({ length: 100 }, (_, i) => makeCandle({ openTime: i }));
    tradingStore.setCandles(seed);
    tradingStore.appendClosedCandle(makeCandle({ openTime: 999 }));
    const stored = tradingStore.candles;
    expect(stored).toHaveLength(100);
    expect(stored[0].openTime).toBe(1);
    expect(stored.at(-1)?.openTime).toBe(999);
  });

  it('setFractals holds typed support/resistance nodes', () => {
    const nodes: FractalNode[] = [
      { type: 'low', price: 90, candleOpenTime: 1 },
      { type: 'high', price: 110, candleOpenTime: 2 },
    ];
    tradingStore.setFractals(nodes);
    expect(tradingStore.fractals).toEqual(nodes);
  });

  it('setLatestInsight can hold a note and be cleared back to null', () => {
    tradingStore.setLatestInsight(makeNote({ title: 'BTC breakout' }));
    expect(tradingStore.latestInsight?.title).toBe('BTC breakout');
    tradingStore.setLatestInsight(null);
    expect(tradingStore.latestInsight).toBeNull();
  });

  it('setLoadingInsight toggles the boolean flag', () => {
    tradingStore.setLoadingInsight(true);
    expect(tradingStore.isLoadingInsight).toBe(true);
    tradingStore.setLoadingInsight(false);
    expect(tradingStore.isLoadingInsight).toBe(false);
  });
});
