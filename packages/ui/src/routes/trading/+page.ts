// Trading route universal loader
//
// Moves TradingFlow's initial status/candles/insight fetch out of the
// component's `onMount` and into a SvelteKit universal loader. Runs
// client-side only (SSR is disabled in the root +layout.ts). The live
// EventSource stream and all interactive mutations stay in the component /
// flow api.ts.
import { api } from '@lib/client';
import type {
  StatusResponse,
  CandlesResponse,
  InsightResponse,
  TradingPageData,
} from '@lib/flows/trading/types';
import type { PageLoad } from './$types';
import { clientLogger } from '@lib/client-logger';

// SPA only — SSR is disabled (also set globally in the root +layout.ts).
export const ssr = false;

async function loadStatus(): Promise<Pick<TradingPageData, 'trading' | 'advisor'>> {
  try {
    const { data, error } = await api.api.trading.status.get();
    if (error) throw new Error('Failed to fetch status');
    const result = data as unknown as StatusResponse;
    return {
      trading: result.trading ?? null,
      advisor: result.advisor ?? null,
    };
  } catch (err) {
    clientLogger.error('Trading status loader failed', { error: err });
    return { trading: null, advisor: null };
  }
}

async function loadCandles(limit: number): Promise<TradingPageData['candles']> {
  try {
    const { data, error } = await api.api.trading.candles.get({
      query: { limit: limit.toString() },
    });
    if (error) throw new Error('Failed to fetch candles');
    const result = data as unknown as CandlesResponse;
    return result.candles ?? [];
  } catch (err) {
    clientLogger.error('Trading candles loader failed', { error: err });
    return [];
  }
}

async function loadInsight(): Promise<TradingPageData['insight']> {
  try {
    const { data, error } = await api.api.trading.insight.get();
    if (error) throw new Error('Failed to fetch insight');
    const result = data as unknown as InsightResponse;
    if (!result.insight) return null;
    const insight = result.insight;
    if (result.debugContext) insight._debugContext = result.debugContext;
    return insight;
  } catch (err) {
    clientLogger.error('Trading insight loader failed', { error: err });
    return null;
  }
}

export const load: PageLoad = async (): Promise<TradingPageData> => {
  const [status, candles, insight] = await Promise.all([
    loadStatus(),
    loadCandles(100),
    loadInsight(),
  ]);

  return {
    trading: status.trading,
    advisor: status.advisor,
    candles,
    insight,
  };
};
