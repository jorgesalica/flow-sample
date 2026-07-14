// Trading Flow Registration
//
// Re-exports types and all public API from split modules:
//   - types.ts          → Response interfaces + loader data shape
//   - stores.svelte.ts  → Runes-based state (tradingStore)
//   - api.ts            → API functions + SSE streaming

import { createStatsBoardCard, FlowStatus, type FlowStats } from '../board-card';
import type { FlowDefinition } from '../registry';
import { api } from '@lib/client';
import type { StatusResponse } from './types';

// Re-export everything consumers need
export type { Candle, FractalNode, AdvisorNote, TradingState, AdvisorState } from '@flows/shared';
export type { SentimentBias, RiskManagement } from '@flows/shared';
export type { TradingPageData } from './types';
export { tradingStore } from './stores.svelte';
export {
  fetchTradingStatus,
  startTrading,
  stopTrading,
  fetchCandles,
  fetchFractals,
  fetchKlines,
  toggleAdvisor,
  generateInsight,
  generateWizardInsight,
  fetchLatestInsight,
  connectToStream,
  disconnectFromStream,
} from './api';

// ============================================
// Flow Registration
// ============================================

async function getTradingStats(): Promise<FlowStats> {
  try {
    const { data, error } = await api.api.trading.status.get();
    if (error) throw new Error('Failed to fetch status');
    const result = data as unknown as StatusResponse;
    return {
      count: result.trading?.candleCount || 0,
      status: result.trading?.isRunning ? FlowStatus.ACTIVE : FlowStatus.CONFIGURED,
      statusMessage: result.trading?.isRunning ? 'Streaming' : 'Stopped',
    };
  } catch {
    return {
      count: 0,
      status: FlowStatus.ERROR,
      statusMessage: 'Disconnected',
    };
  }
}

// Flow definition — hung on the board centrally in flows/index.ts
export const tradingFlow: FlowDefinition = {
  id: 'trading',
  name: 'Trading Bot',
  icon: '📈',
  description: 'Real-time BTC analysis with Hurst exponent, fractals, and AI-powered insights.',
  route: '/trading',
  boardCard: createStatsBoardCard(getTradingStats, {
    metricLabel: 'Candles',
    emptyTitle: 'No market data yet',
    emptyMessage: 'Open Trading Bot to start the stream.',
    errorTitle: 'Trading summary unavailable',
    errorMessage: 'Connect the backend and refresh the board to try again.',
  }),
};

export { getTradingStats };
