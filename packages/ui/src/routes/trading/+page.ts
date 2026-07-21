// Trading route universal loader
//
// Moves TradingFlow's initial status/candles/insight fetch out of the
// component's `onMount` and into a SvelteKit universal loader. Runs
// client-side only (SSR is disabled in the root +layout.ts). The live
// EventSource stream and all interactive mutations stay in the component /
// flow api.ts.
import { createApiClient, type ApiClient } from '@lib/client';
import type { TradingPageData } from '@lib/flows/trading/types';
import type { PageLoad } from './$types';
import { clientLogger } from '@lib/client-logger';

// SPA only — SSR is disabled (also set globally in the root +layout.ts).
export const ssr = false;

async function loadStatus(api: ApiClient): Promise<Pick<TradingPageData, 'trading' | 'advisor'>> {
  try {
    const { data, error } = await api.api.trading.status.get();
    if (error || !data) throw new Error('Failed to fetch status');
    return {
      trading: data.trading ?? null,
      advisor: data.advisor ?? null,
    };
  } catch (err) {
    clientLogger.error('Trading status loader failed', { error: err });
    return { trading: null, advisor: null };
  }
}

async function loadCandles(api: ApiClient, limit: number): Promise<TradingPageData['candles']> {
  try {
    const { data, error } = await api.api.trading.candles.get({
      query: { limit },
    });
    if (error || !data) throw new Error('Failed to fetch candles');
    return data.candles ?? [];
  } catch (err) {
    clientLogger.error('Trading candles loader failed', { error: err });
    return [];
  }
}

async function loadInsight(api: ApiClient): Promise<TradingPageData['insight']> {
  try {
    const { data, error } = await api.api.trading.insight.get();
    if (error || !data) throw new Error('Failed to fetch insight');
    if (!data.insight) return null;
    return data.debugContext == null
      ? data.insight
      : { ...data.insight, _debugContext: data.debugContext };
  } catch (err) {
    clientLogger.error('Trading insight loader failed', { error: err });
    return null;
  }
}

export const load: PageLoad = async ({ fetch }): Promise<TradingPageData> => {
  const api = createApiClient(fetch);
  const [status, candles, insight] = await Promise.all([
    loadStatus(api),
    loadCandles(api, 100),
    loadInsight(api),
  ]);

  return {
    trading: status.trading,
    advisor: status.advisor,
    candles,
    insight,
  };
};
