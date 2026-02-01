// Trading Flow Registration and Store
import { registerFlow, type FlowStats } from './registry';
import { writable } from 'svelte/store';
import { showError, showSuccess } from '@lib/toast';

// ============================================
// Types
// ============================================

export interface Candle {
  symbol: string;
  interval: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface FractalNode {
  type: 'high' | 'low';
  price: number;
  candleOpenTime: number;
}

export interface AdvisorNote {
  title: string;
  regime_context: string;
  scenario_bullish: string;
  scenario_bearish: string;
  mentor_tip: string;
}

export interface TradingState {
  isRunning: boolean;
  symbol: string;
  interval: string;
  lastCandle: Candle | null;
  candleCount: number;
  connectedAt: string | null;
}

export interface AdvisorState {
  isEnabled: boolean;
  lastInsightAt: string | null;
  insightCount: number;
}

// ============================================
// Stores
// ============================================

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

// ============================================
// API Functions
// ============================================

const TRADING_API = '/api/trading';

export async function fetchTradingStatus(): Promise<void> {
  try {
    const res = await fetch(`${TRADING_API}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    const data = await res.json();
    if (data.trading) tradingState.set(data.trading);
    if (data.advisor) advisorState.set(data.advisor);
  } catch (error) {
    console.error('[TradingFlow] Status fetch failed:', error);
  }
}

export async function startTrading(): Promise<void> {
  try {
    const res = await fetch(`${TRADING_API}/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start');
    const data = await res.json();

    // Update state immediately from response
    if (data.state) {
      tradingState.set(data.state);
    }

    showSuccess('Trading stream started');

    // Also fetch full status to ensure sync
    await fetchTradingStatus();
  } catch (error) {
    showError('Failed to start trading stream');
    console.error(error);
  }
}

export async function stopTrading(): Promise<void> {
  try {
    const res = await fetch(`${TRADING_API}/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop');
    const data = await res.json();

    // Update state immediately from response
    if (data.state) {
      tradingState.set(data.state);
    }

    showSuccess('Trading stream stopped');

    // Also fetch full status to ensure sync
    await fetchTradingStatus();
  } catch (error) {
    showError('Failed to stop trading stream');
    console.error(error);
  }
}

export async function fetchCandles(limit: number = 100): Promise<void> {
  try {
    const res = await fetch(`${TRADING_API}/candles?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch candles');
    const data = await res.json();
    candles.set(data.candles || []);
  } catch (error) {
    console.error('[TradingFlow] Candles fetch failed:', error);
  }
}

export async function fetchFractals(limit: number = 50): Promise<void> {
  try {
    const res = await fetch(`${TRADING_API}/fractals?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch fractals');
    const data = await res.json();
    fractals.set(data.nodes || []);
  } catch (error) {
    console.error('[TradingFlow] Fractals fetch failed:', error);
  }
}

export async function toggleAdvisor(): Promise<void> {
  try {
    const res = await fetch(`${TRADING_API}/advisor/toggle`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle advisor');
    const data = await res.json();
    advisorState.update((s) => ({ ...s, isEnabled: data.active }));
    showSuccess(data.message);
  } catch (error) {
    showError('Failed to toggle advisor');
    console.error(error);
  }
}

export async function generateInsight(): Promise<void> {
  isLoadingInsight.set(true);
  try {
    const res = await fetch(`${TRADING_API}/insight/generate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate insight');
    const data = await res.json();
    if (data.success && data.insight) {
      latestInsight.set(data.insight);
      showSuccess('Insight generated!');
    } else {
      showError(data.error || 'Failed to generate insight');
    }
  } catch (error) {
    showError('Failed to generate insight');
    console.error(error);
  } finally {
    isLoadingInsight.set(false);
  }
}

export async function fetchLatestInsight(): Promise<void> {
  try {
    const res = await fetch(`${TRADING_API}/insight`);
    if (!res.ok) throw new Error('Failed to fetch insight');
    const data = await res.json();
    if (data.insight) {
      latestInsight.set(data.insight);
    }
  } catch (error) {
    console.error('[TradingFlow] Insight fetch failed:', error);
  }
}

// ============================================
// SSE Real-time Stream
// ============================================

let eventSource: EventSource | null = null;

export function connectToStream(): void {
  if (eventSource) return;

  eventSource = new EventSource(`${TRADING_API}/stream`);

  eventSource.addEventListener('candle', (event) => {
    const candle = JSON.parse(event.data) as Candle;
    tradingState.update((s) => ({ ...s, lastCandle: candle }));
  });

  eventSource.addEventListener('candleClosed', (event) => {
    const candle = JSON.parse(event.data) as Candle;
    candles.update((arr) => [...arr.slice(-99), candle]);
    tradingState.update((s) => ({ ...s, candleCount: s.candleCount + 1 }));
  });

  eventSource.addEventListener('state', (event) => {
    const state = JSON.parse(event.data);
    tradingState.set(state);
  });

  eventSource.onerror = () => {
    console.error('[TradingFlow] SSE connection error');
    disconnectFromStream();
  };
}

export function disconnectFromStream(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

// ============================================
// Flow Registration
// ============================================

async function getTradingStats(): Promise<FlowStats> {
  try {
    const res = await fetch(`${TRADING_API}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    const data = await res.json();
    return {
      count: data.trading?.candleCount || 0,
      status: data.trading?.isRunning ? 'active' : 'configured',
      statusMessage: data.trading?.isRunning ? 'Streaming' : 'Stopped',
    };
  } catch {
    return {
      count: 0,
      status: 'error',
      statusMessage: 'Disconnected',
    };
  }
}

// Auto-register on import
registerFlow({
  id: 'trading',
  name: 'Trading Bot',
  icon: '📈',
  description: 'Real-time BTC analysis with Hurst exponent, fractals, and AI-powered insights.',
  route: '#/trading',
  color: 'from-amber-400 to-orange-500',
  getStats: getTradingStats,
});

export { getTradingStats };
