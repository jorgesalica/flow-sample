// Trading Flow API Functions
import { showError, showSuccess } from '@lib/toast';
import { api } from '@lib/client';
import { clientLogger } from '@lib/client-logger';
import type { Candle, AdvisorNote } from '@flows/shared';
import { tradingStore } from './stores.svelte';
import type {
  StatusResponse,
  StateResponse,
  CandlesResponse,
  FractalsResponse,
  AdvisorToggleResponse,
  InsightResponse,
  WizardAnalysis,
  WizardInsightResponse,
} from './types';

export async function fetchTradingStatus(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.status.get();
    if (error) throw new Error('Failed to fetch status');
    const result = data as unknown as StatusResponse;
    if (result.trading) tradingStore.setTradingState(result.trading);
    if (result.advisor) tradingStore.setAdvisorState(result.advisor);
  } catch (error) {
    clientLogger.error('Trading status fetch failed', { error });
  }
}

export async function startTrading(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.start.post();
    if (error) throw new Error('Failed to start');
    const result = data as unknown as StateResponse;

    if (result.state) {
      tradingStore.setTradingState(result.state);
    }

    showSuccess('Trading stream started');
    await fetchTradingStatus();
  } catch (error) {
    showError('Failed to start trading stream');
    clientLogger.error('Trading stream start failed', { error });
  }
}

export async function stopTrading(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.stop.post();
    if (error) throw new Error('Failed to stop');
    const result = data as unknown as StateResponse;

    if (result.state) {
      tradingStore.setTradingState(result.state);
    }

    showSuccess('Trading stream stopped');
    await fetchTradingStatus();
  } catch (error) {
    showError('Failed to stop trading stream');
    clientLogger.error('Trading stream stop failed', { error });
  }
}

export async function fetchCandles(limit: number = 100): Promise<void> {
  try {
    const { data, error } = await api.api.trading.candles.get({
      query: { limit: limit.toString() },
    });
    if (error) throw new Error('Failed to fetch candles');
    const result = data as unknown as CandlesResponse;
    tradingStore.setCandles(result.candles || []);
  } catch (error) {
    clientLogger.error('Trading candles fetch failed', { error });
  }
}

export async function fetchFractals(limit: number = 50): Promise<void> {
  try {
    const { data, error } = await api.api.trading.fractals.get({
      query: { limit: limit.toString() },
    });
    if (error) throw new Error('Failed to fetch fractals');
    const result = data as unknown as FractalsResponse;
    tradingStore.setFractals(result.nodes || []);
  } catch (error) {
    clientLogger.error('Trading fractals fetch failed', { error });
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
    const result = data as unknown as CandlesResponse;
    return result.candles || [];
  } catch (error) {
    clientLogger.error('Trading klines fetch failed', { error });
    return [];
  }
}

export async function toggleAdvisor(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.advisor.toggle.post();
    if (error) throw new Error('Failed to toggle advisor');
    const result = data as unknown as AdvisorToggleResponse;
    tradingStore.updateAdvisorState((s) => ({ ...s, isEnabled: result.active }));
    showSuccess(result.message);
  } catch (error) {
    showError('Failed to toggle advisor');
    clientLogger.error('Trading advisor toggle failed', { error });
  }
}

export async function generateInsight(): Promise<void> {
  tradingStore.setLoadingInsight(true);
  try {
    const { data, error } = await api.api.trading.insight.generate.post();
    if (error) throw new Error('Failed to generate insight');
    const result = data as unknown as InsightResponse;
    if (result.success && result.insight) {
      const insight = result.insight;
      if (result.debugContext) insight._debugContext = result.debugContext;
      tradingStore.setLatestInsight(insight);
      showSuccess('Insight generated!');
    } else {
      showError(result.error || 'Failed to generate insight');
    }
  } catch (error) {
    showError('Failed to generate insight');
    clientLogger.error('Trading insight generation failed', { error });
  } finally {
    tradingStore.setLoadingInsight(false);
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
  analysis: WizardAnalysis;
  meta: Record<string, unknown>;
} | null> {
  try {
    const { data, error } = await api.api.trading.wizard.insight.post(params);
    if (error) throw new Error('Failed to generate wizard insight');
    const result = data as unknown as WizardInsightResponse;
    if (result.success && result.insight) {
      return {
        insight: result.insight,
        analysis: result.analysis || {},
        meta: result.meta || {},
      };
    } else {
      showError(result.error || 'Wizard insight generation failed');
      return null;
    }
  } catch (error) {
    showError('Failed to generate wizard insight');
    clientLogger.error('Trading wizard insight failed', { error });
    return null;
  }
}

export async function fetchLatestInsight(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.insight.get();
    if (error) throw new Error('Failed to fetch insight');
    const result = data as unknown as InsightResponse;
    if (result.insight) {
      const insight = result.insight;
      if (result.debugContext) insight._debugContext = result.debugContext;
      tradingStore.setLatestInsight(insight);
    }
  } catch (error) {
    clientLogger.error('Trading insight fetch failed', { error });
  }
}

// ============================================
// SSE Real-time Stream
// ============================================

import type { TradingState } from '@flows/shared';

let eventSource: EventSource | null = null;

export function connectToStream(): void {
  if (eventSource) return;

  eventSource = new EventSource('/api/trading/stream');

  eventSource.addEventListener('candle', (event) => {
    const candle = JSON.parse(event.data) as Candle;
    tradingStore.updateTradingState((s) => ({ ...s, lastCandle: candle }));
  });

  eventSource.addEventListener('candleClosed', (event) => {
    const candle = JSON.parse(event.data) as Candle;
    tradingStore.appendClosedCandle(candle);
    tradingStore.updateTradingState((s) => ({ ...s, candleCount: s.candleCount + 1 }));
  });

  eventSource.addEventListener('state', (event) => {
    const state = JSON.parse(event.data) as TradingState;
    tradingStore.setTradingState(state);
  });

  eventSource.onerror = () => {
    clientLogger.error('Trading SSE connection failed');
    disconnectFromStream();
  };
}

export function disconnectFromStream(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}
