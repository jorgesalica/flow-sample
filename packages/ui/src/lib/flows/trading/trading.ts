// Trading Flow Registration
//
// Re-exports types and all public API from split modules:
//   - types.ts   → Response interfaces
//   - stores.ts  → Svelte stores
//   - api.ts     → API functions + SSE streaming

import { type FlowStats, type FlowDefinition } from '../registry';
import { api } from '@lib/client';
import TradingFlow from './TradingFlow.svelte';
import type { StatusResponse } from './types';

// Re-export everything consumers need
export type { Candle, FractalNode, AdvisorNote, TradingState, AdvisorState } from '@flows/shared';
export type { SentimentBias, RiskManagement } from '@flows/shared';
export {
  tradingState,
  advisorState,
  candles,
  fractals,
  latestInsight,
  isLoadingInsight,
} from './stores';
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

// Flow definition — hung on the board centrally in flows/index.ts
export const tradingFlow: FlowDefinition = {
  id: 'trading',
  name: 'Trading Bot',
  icon: '📈',
  description: 'Real-time BTC analysis with Hurst exponent, fractals, and AI-powered insights.',
  route: '/trading',
  color: 'from-amber-400 to-orange-500',
  component: TradingFlow,
  getStats: getTradingStats,
};

export { getTradingStats };
