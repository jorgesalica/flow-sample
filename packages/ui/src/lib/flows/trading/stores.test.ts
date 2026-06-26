import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { Candle, FractalNode, AdvisorNote } from '@flows/shared';
import {
  tradingState,
  advisorState,
  candles,
  fractals,
  latestInsight,
  isLoadingInsight,
} from './stores';

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

// Reset every store to a known baseline before each test so order is irrelevant.
beforeEach(() => {
  tradingState.set({
    isRunning: false,
    symbol: 'BTCUSDT',
    interval: '1m',
    lastCandle: null,
    candleCount: 0,
    connectedAt: null,
  });
  advisorState.set({ isEnabled: false, lastInsightAt: null, insightCount: 0 });
  candles.set([]);
  fractals.set([]);
  latestInsight.set(null);
  isLoadingInsight.set(false);
});

describe('trading stores — initial contract', () => {
  it('tradingState starts stopped with BTCUSDT/1m defaults and no candle', () => {
    const state = get(tradingState);
    expect(state.isRunning).toBe(false);
    expect(state.symbol).toBe('BTCUSDT');
    expect(state.interval).toBe('1m');
    expect(state.lastCandle).toBeNull();
    expect(state.candleCount).toBe(0);
    expect(state.connectedAt).toBeNull();
  });

  it('advisorState starts disabled with zero insights', () => {
    const state = get(advisorState);
    expect(state.isEnabled).toBe(false);
    expect(state.lastInsightAt).toBeNull();
    expect(state.insightCount).toBe(0);
  });

  it('collection stores start empty and insight flags start falsy', () => {
    expect(get(candles)).toEqual([]);
    expect(get(fractals)).toEqual([]);
    expect(get(latestInsight)).toBeNull();
    expect(get(isLoadingInsight)).toBe(false);
  });
});

describe('trading stores — set/update behavior', () => {
  it('tradingState.set replaces the whole state object', () => {
    const candle = makeCandle({ close: 200 });
    tradingState.set({
      isRunning: true,
      symbol: 'ETHUSDT',
      interval: '5m',
      lastCandle: candle,
      candleCount: 42,
      connectedAt: '2023-11-14T22:13:20.000Z',
    });
    const state = get(tradingState);
    expect(state.isRunning).toBe(true);
    expect(state.symbol).toBe('ETHUSDT');
    expect(state.lastCandle?.close).toBe(200);
    expect(state.candleCount).toBe(42);
  });

  it('advisorState.update toggles isEnabled without dropping other fields', () => {
    advisorState.set({ isEnabled: false, lastInsightAt: '2023-01-01', insightCount: 3 });
    advisorState.update((s) => ({ ...s, isEnabled: true }));
    const state = get(advisorState);
    expect(state.isEnabled).toBe(true);
    expect(state.lastInsightAt).toBe('2023-01-01');
    expect(state.insightCount).toBe(3);
  });

  it('candles store holds an ordered list of candles', () => {
    const list = [makeCandle({ openTime: 1 }), makeCandle({ openTime: 2 })];
    candles.set(list);
    const stored = get(candles);
    expect(stored).toHaveLength(2);
    expect(stored[0].openTime).toBe(1);
    expect(stored[1].openTime).toBe(2);
  });

  it('candles.update mimics the rolling-window append used by the SSE handler', () => {
    candles.set([makeCandle({ openTime: 1 })]);
    candles.update((arr) => [...arr.slice(-99), makeCandle({ openTime: 2 })]);
    const stored = get(candles);
    expect(stored).toHaveLength(2);
    expect(stored.at(-1)?.openTime).toBe(2);
  });

  it('fractals store holds typed support/resistance nodes', () => {
    const nodes: FractalNode[] = [
      { type: 'low', price: 90, candleOpenTime: 1 },
      { type: 'high', price: 110, candleOpenTime: 2 },
    ];
    fractals.set(nodes);
    expect(get(fractals)).toEqual(nodes);
  });

  it('latestInsight can hold a note and be cleared back to null', () => {
    latestInsight.set(makeNote({ title: 'BTC breakout' }));
    expect(get(latestInsight)?.title).toBe('BTC breakout');
    latestInsight.set(null);
    expect(get(latestInsight)).toBeNull();
  });

  it('isLoadingInsight toggles boolean flag', () => {
    isLoadingInsight.set(true);
    expect(get(isLoadingInsight)).toBe(true);
    isLoadingInsight.set(false);
    expect(get(isLoadingInsight)).toBe(false);
  });
});
