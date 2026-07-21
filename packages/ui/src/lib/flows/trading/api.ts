import { api } from '@lib/client';
import { clientLogger } from '@lib/client-logger';
import { showError, showSuccess } from '@lib/toast';
import type {
  AdvisorNote,
  Candle,
  TradingKlineInterval,
  TradingPreviousInsight,
  TradingState,
  TradingWizardAnalysis,
  TradingWizardInsightMeta,
} from '@flows/shared';
import { tradingStore } from './stores.svelte';

export async function fetchTradingStatus(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.status.get();
    if (error || !data) throw new Error('Failed to fetch status');
    tradingStore.setTradingState(data.trading);
    tradingStore.setAdvisorState(data.advisor);
  } catch (error) {
    clientLogger.error('Trading status fetch failed', { error });
  }
}

export async function startTrading(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.start.post();
    if (error || !data) throw new Error('Failed to start');
    tradingStore.setTradingState(data.state);
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
    if (error || !data) throw new Error('Failed to stop');
    tradingStore.setTradingState(data.state);
    showSuccess('Trading stream stopped');
    await fetchTradingStatus();
  } catch (error) {
    showError('Failed to stop trading stream');
    clientLogger.error('Trading stream stop failed', { error });
  }
}

export async function fetchCandles(limit: number = 100): Promise<void> {
  try {
    const { data, error } = await api.api.trading.candles.get({ query: { limit } });
    if (error || !data) throw new Error('Failed to fetch candles');
    tradingStore.setCandles(data.candles);
  } catch (error) {
    clientLogger.error('Trading candles fetch failed', { error });
  }
}

export async function fetchFractals(limit: number = 50): Promise<void> {
  try {
    const { data, error } = await api.api.trading.fractals.get({ query: { limit } });
    if (error || !data) throw new Error('Failed to fetch fractals');
    tradingStore.setFractals(data.nodes);
  } catch (error) {
    clientLogger.error('Trading fractals fetch failed', { error });
  }
}

export async function fetchKlines(
  interval: TradingKlineInterval,
  limit: number = 100
): Promise<Candle[]> {
  try {
    const { data, error } = await api.api.trading.klines.get({
      query: { interval, limit },
    });
    if (error || !data) throw new Error('Failed to fetch klines');
    return data.candles;
  } catch (error) {
    clientLogger.error('Trading klines fetch failed', { error });
    return [];
  }
}

export async function toggleAdvisor(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.advisor.toggle.post();
    if (error || !data) throw new Error('Failed to toggle advisor');
    tradingStore.updateAdvisorState((state) => ({ ...state, isEnabled: data.active }));
    showSuccess(data.message);
  } catch (error) {
    showError('Failed to toggle advisor');
    clientLogger.error('Trading advisor toggle failed', { error });
  }
}

export async function generateInsight(): Promise<void> {
  tradingStore.setLoadingInsight(true);
  try {
    const { data, error } = await api.api.trading.insight.generate.post();
    if (error || !data) throw new Error('Failed to generate insight');
    tradingStore.setLatestInsight(data.insight);
    showSuccess('Insight generated!');
  } catch (error) {
    showError('Failed to generate insight');
    clientLogger.error('Trading insight generation failed', { error });
  } finally {
    tradingStore.setLoadingInsight(false);
  }
}

export async function generateWizardInsight(params: {
  interval: TradingKlineInterval;
  limit: number;
  stepLabel: string;
  promptContext: string;
  previousInsights: TradingPreviousInsight[];
}): Promise<{
  insight: AdvisorNote;
  analysis: TradingWizardAnalysis;
  meta: TradingWizardInsightMeta;
} | null> {
  try {
    const { data, error } = await api.api.trading.wizard.insight.post(params);
    if (error || !data) throw new Error('Failed to generate wizard insight');
    return {
      insight: data.insight,
      analysis: data.analysis,
      meta: data.meta,
    };
  } catch (error) {
    showError('Failed to generate wizard insight');
    clientLogger.error('Trading wizard insight failed', { error });
    return null;
  }
}

export async function fetchLatestInsight(): Promise<void> {
  try {
    const { data, error } = await api.api.trading.insight.get();
    if (error || !data) throw new Error('Failed to fetch insight');
    if (!data.insight) return;
    tradingStore.setLatestInsight(
      data.debugContext === null
        ? data.insight
        : { ...data.insight, _debugContext: data.debugContext }
    );
  } catch (error) {
    clientLogger.error('Trading insight fetch failed', { error });
  }
}

let eventSource: EventSource | null = null;

export function connectToStream(): void {
  if (eventSource) return;

  eventSource = new EventSource('/api/trading/stream');

  eventSource.addEventListener('candle', (event) => {
    const candle = parseStreamEvent(event, isCandle);
    if (!candle) return;
    tradingStore.updateTradingState((state) => ({ ...state, lastCandle: candle }));
  });

  eventSource.addEventListener('candleClosed', (event) => {
    const candle = parseStreamEvent(event, isCandle);
    if (!candle) return;
    tradingStore.appendClosedCandle(candle);
    tradingStore.updateTradingState((state) => ({
      ...state,
      candleCount: state.candleCount + 1,
    }));
  });

  eventSource.addEventListener('state', (event) => {
    const state = parseStreamEvent(event, isTradingState);
    if (state) tradingStore.setTradingState(state);
  });

  eventSource.onerror = () => {
    clientLogger.error('Trading SSE connection failed');
    disconnectFromStream();
  };
}

export function disconnectFromStream(): void {
  eventSource?.close();
  eventSource = null;
}

function parseStreamEvent<T>(
  event: MessageEvent,
  validate: (value: unknown) => value is T
): T | null {
  try {
    if (typeof event.data !== 'string') return null;
    const value: unknown = JSON.parse(event.data);
    if (validate(value)) return value;
  } catch (error) {
    clientLogger.error('Trading SSE payload parsing failed', { error });
    return null;
  }

  clientLogger.error('Trading SSE payload validation failed');
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCandle(value: unknown): value is Candle {
  return (
    isRecord(value) &&
    typeof value.symbol === 'string' &&
    typeof value.interval === 'string' &&
    typeof value.openTime === 'number' &&
    typeof value.closeTime === 'number' &&
    typeof value.open === 'number' &&
    typeof value.high === 'number' &&
    typeof value.low === 'number' &&
    typeof value.close === 'number' &&
    typeof value.volume === 'number' &&
    typeof value.isClosed === 'boolean'
  );
}

function isTradingState(value: unknown): value is TradingState {
  return (
    isRecord(value) &&
    typeof value.isRunning === 'boolean' &&
    typeof value.symbol === 'string' &&
    typeof value.interval === 'string' &&
    (value.lastCandle === null || isCandle(value.lastCandle)) &&
    typeof value.candleCount === 'number' &&
    (value.connectedAt === null || typeof value.connectedAt === 'string')
  );
}
