// Trading Flow Registration and Store
import { registerFlow, type FlowStats } from './registry';
import { writable } from 'svelte/store';
import { showError, showSuccess } from '@lib/toast';
import { api } from '@lib/client';
import TradingFlow from '@lib/pages/TradingFlow.svelte';
import type { Candle, FractalNode, AdvisorNote, TradingState, AdvisorState } from '@flows/shared';

// Re-export types from shared for UI consumers
export type { Candle, FractalNode, AdvisorNote, TradingState, AdvisorState };
export type { SentimentBias, RiskManagement } from '@flows/shared';

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
// API Functions (Eden-based)
// ============================================

export async function fetchTradingStatus(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.status.get();
    if (error) throw new Error('Failed to fetch status');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    if (result.trading) tradingState.set(result.trading);
    if (result.advisor) advisorState.set(result.advisor);
  } catch (error) {
    console.error('[TradingFlow] Status fetch failed:', error);
  }
}

export async function startTrading(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.start.post();
    if (error) throw new Error('Failed to start');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;

    if (result.state) {
      tradingState.set(result.state);
    }

    showSuccess('Trading stream started');
    await fetchTradingStatus();
  } catch (error) {
    showError('Failed to start trading stream');
    console.error(error);
  }
}

export async function stopTrading(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.stop.post();
    if (error) throw new Error('Failed to stop');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;

    if (result.state) {
      tradingState.set(result.state);
    }

    showSuccess('Trading stream stopped');
    await fetchTradingStatus();
  } catch (error) {
    showError('Failed to stop trading stream');
    console.error(error);
  }
}

export async function fetchCandles(limit: number = 100): Promise<void> {
  try {
    const { data, error } = await api.api.trading.candles.get({
      query: { limit: limit.toString() },
    });
    if (error) throw new Error('Failed to fetch candles');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    candles.set(result.candles || []);
  } catch (error) {
    console.error('[TradingFlow] Candles fetch failed:', error);
  }
}

export async function fetchFractals(limit: number = 50): Promise<void> {
  try {
    const { data, error } = await api.api.trading.fractals.get({
      query: { limit: limit.toString() },
    });
    if (error) throw new Error('Failed to fetch fractals');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    fractals.set(result.nodes || []);
  } catch (error) {
    console.error('[TradingFlow] Fractals fetch failed:', error);
  }
}

/**
 * Fetch historical klines for a specific timeframe (for Cascade Wizard)
 */
export async function fetchKlines(interval: string, limit: number = 100): Promise<Candle[]> {
  try {
    const { data, error } = await api.api.trading.klines.get({
      query: {
        interval,
        limit: limit.toString(),
      },
    });
    if (error) throw new Error('Failed to fetch klines');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    return result.candles || [];
  } catch (error) {
    console.error('[TradingFlow] Klines fetch failed:', error);
    return [];
  }
}

export async function toggleAdvisor(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.advisor.toggle.post();
    if (error) throw new Error('Failed to toggle advisor');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    advisorState.update((s) => ({ ...s, isEnabled: result.active }));
    showSuccess(result.message);
  } catch (error) {
    showError('Failed to toggle advisor');
    console.error(error);
  }
}

export async function generateInsight(): Promise<void> {
  isLoadingInsight.set(true);
  try {
    const { data, error } = await api.api.trading.insight.generate.post();
    if (error) throw new Error('Failed to generate insight');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    if (result.success && result.insight) {
      const insight = result.insight;
      if (result.debugContext) insight._debugContext = result.debugContext;
      latestInsight.set(insight);
      showSuccess('Insight generated!');
    } else {
      showError(result.error || 'Failed to generate insight');
    }
  } catch (error) {
    showError('Failed to generate insight');
    console.error(error);
  } finally {
    isLoadingInsight.set(false);
  }
}

/**
 * Generate insight using the Wizard endpoint
 */
export async function generateWizardInsight(params: {
  interval: string;
  limit: number;
  stepLabel: string;
  promptContext: string;
  previousInsights: { label: string; insight: AdvisorNote }[];
}): Promise<{
  insight: AdvisorNote;
  analysis: Record<string, unknown>;
  meta: Record<string, unknown>;
} | null> {
  try {
    const { data, error } = await api.api.trading.wizard.insight.post(params);
    if (error) throw new Error('Failed to generate wizard insight');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    if (result.success && result.insight) {
      return {
        insight: result.insight,
        analysis: result.analysis,
        meta: result.meta,
      };
    } else {
      showError(result.error || 'Wizard insight generation failed');
      return null;
    }
  } catch (error) {
    showError('Failed to generate wizard insight');
    console.error('[TradingFlow] Wizard insight failed:', error);
    return null;
  }
}

export async function fetchLatestInsight(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.insight.get();
    if (error) throw new Error('Failed to fetch insight');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    if (result.insight) {
      const insight = result.insight;
      if (result.debugContext) insight._debugContext = result.debugContext;
      latestInsight.set(insight);
    }
  } catch (error) {
    console.error('[TradingFlow] Insight fetch failed:', error);
  }
}

// ============================================
// SSE Real-time Stream (stays as EventSource — Eden doesn't replace SSE)
// ============================================

let eventSource: EventSource | null = null;

export function connectToStream(): void {
  if (eventSource) return;

  eventSource = new EventSource('/api/trading/stream');

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
    const { data, error } = await api.api.trading.status.get();
    if (error) throw new Error('Failed to fetch status');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    return {
      count: result.trading?.candleCount || 0,
      status: result.trading?.isRunning ? 'active' : 'configured',
      statusMessage: result.trading?.isRunning ? 'Streaming' : 'Stopped',
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
  component: TradingFlow,
  getStats: getTradingStats,
});

export { getTradingStats };
