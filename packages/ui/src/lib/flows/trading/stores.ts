// Trading Flow Stores
import { writable } from 'svelte/store';
import type { Candle, FractalNode, AdvisorNote, TradingState, AdvisorState } from '@flows/shared';

export const tradingState = writable<TradingState>({
  isRunning: false,
  symbol: 'BTCUSDT',
  interval: '1m',
  lastCandle: null,
  candleCount: 0,
  connectedAt: null,
});

export const advisorState = writable<AdvisorState>({
  isEnabled: false,
  lastInsightAt: null,
  insightCount: 0,
});

export const candles = writable<Candle[]>([]);
export const fractals = writable<FractalNode[]>([]);
export const latestInsight = writable<AdvisorNote | null>(null);
export const isLoadingInsight = writable(false);
