import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdvisorNote, Candle, TradingState, TradingWizardAnalysis } from '@flows/shared';

const mocks = vi.hoisted(() => ({
  statusGet: vi.fn(),
  startPost: vi.fn(),
  stopPost: vi.fn(),
  candlesGet: vi.fn(),
  fractalsGet: vi.fn(),
  klinesGet: vi.fn(),
  togglePost: vi.fn(),
  generatePost: vi.fn(),
  wizardPost: vi.fn(),
  insightGet: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  logError: vi.fn(),
  store: {
    setTradingState: vi.fn(),
    setAdvisorState: vi.fn(),
    updateTradingState: vi.fn(),
    updateAdvisorState: vi.fn(),
    setCandles: vi.fn(),
    setFractals: vi.fn(),
    appendClosedCandle: vi.fn(),
    setLatestInsight: vi.fn(),
    setLoadingInsight: vi.fn(),
  },
}));

vi.mock('@lib/client', () => ({
  api: {
    api: {
      trading: {
        status: { get: mocks.statusGet },
        start: { post: mocks.startPost },
        stop: { post: mocks.stopPost },
        candles: { get: mocks.candlesGet },
        fractals: { get: mocks.fractalsGet },
        klines: { get: mocks.klinesGet },
        advisor: { toggle: { post: mocks.togglePost } },
        insight: {
          get: mocks.insightGet,
          generate: { post: mocks.generatePost },
        },
        wizard: { insight: { post: mocks.wizardPost } },
      },
    },
  },
}));
vi.mock('./stores.svelte', () => ({ tradingStore: mocks.store }));
vi.mock('@lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
vi.mock('@lib/client-logger', () => ({
  clientLogger: { error: mocks.logError },
}));

class FakeEventSource {
  static instance: FakeEventSource | null = null;
  readonly listeners = new Map<string, (event: MessageEvent) => void>();
  readonly close = vi.fn();
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeEventSource.instance = this;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    this.listeners.set(type, listener);
  }

  emit(type: string, value: unknown): void {
    this.listeners.get(type)?.(new MessageEvent(type, { data: JSON.stringify(value) }));
  }
}

vi.stubGlobal('EventSource', FakeEventSource);

const api = await import('./api');

const candle: Candle = {
  symbol: 'BTCUSDT',
  interval: '1m',
  openTime: 1,
  closeTime: 2,
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 12,
  isClosed: true,
};

const state: TradingState = {
  isRunning: true,
  symbol: 'BTCUSDT',
  interval: '1m',
  lastCandle: candle,
  candleCount: 1,
  connectedAt: '2026-01-01T00:00:00.000Z',
};

const note: AdvisorNote = {
  title: 'Trend intact',
  sentiment_bias: 'LONG',
  regime_context: 'Trending',
  scenario_bullish: 'Break resistance',
  scenario_bearish: 'Lose support',
  mentor_tip: 'Wait for confirmation',
  reasoning_key_factors: ['Hurst'],
  confidence_score: 70,
};

const analysis: TradingWizardAnalysis = {
  market_context: {
    symbol: 'BTCUSDT',
    timestamp: '2026-01-01T00:00:00.000Z',
    price: 105,
    price_change_24h_percent: '5.00%',
  },
  regime_analysis: {
    classification: 'TRENDING',
    hurst_exponent: '0.650',
    fractal_dimension: '1.350',
    interpretation: 'Trending',
  },
  fractal_structure: {
    nearest_resistance: 110,
    distance_to_resistance: '+4.76%',
    resistance_touch_count: 2,
    nearest_support: 90,
    distance_to_support: '-14.29%',
    support_touch_count: 3,
    active_nodes_count: 5,
  },
  candle_patterns: [],
  indicators: { rsi: '55.0', macd: 'N/A' },
};

describe('Trading API', () => {
  beforeEach(() => {
    api.disconnectFromStream();
    vi.clearAllMocks();
    FakeEventSource.instance = null;
  });

  it('hydrates status from the inferred Eden response', async () => {
    const advisor = { isEnabled: false, lastInsightAt: null, insightCount: 0 };
    mocks.statusGet.mockResolvedValue({
      data: { success: true, trading: state, advisor },
      error: null,
    });

    await api.fetchTradingStatus();

    expect(mocks.store.setTradingState).toHaveBeenCalledWith(state);
    expect(mocks.store.setAdvisorState).toHaveBeenCalledWith(advisor);
  });

  it('uses typed numeric queries for candles, fractals, and klines', async () => {
    mocks.candlesGet.mockResolvedValue({
      data: { success: true, count: 1, candles: [candle] },
      error: null,
    });
    mocks.fractalsGet.mockResolvedValue({
      data: {
        success: true,
        count: 1,
        nodes: [{ type: 'high', price: 110, candleOpenTime: 1 }],
      },
      error: null,
    });
    mocks.klinesGet.mockResolvedValue({
      data: {
        success: true,
        count: 1,
        symbol: 'BTCUSDT',
        interval: '4h',
        candles: [candle],
      },
      error: null,
    });

    await api.fetchCandles(7);
    await api.fetchFractals(4);
    await expect(api.fetchKlines('4h', 20)).resolves.toEqual([candle]);

    expect(mocks.candlesGet).toHaveBeenCalledWith({ query: { limit: 7 } });
    expect(mocks.fractalsGet).toHaveBeenCalledWith({ query: { limit: 4 } });
    expect(mocks.klinesGet).toHaveBeenCalledWith({
      query: { interval: '4h', limit: 20 },
    });
  });

  it('returns the typed wizard result without response casts', async () => {
    const meta = { interval: '1d', candleCount: 1, tokensUsed: 10, latencyMs: 20 };
    mocks.wizardPost.mockResolvedValue({
      data: { success: true, insight: note, analysis, meta },
      error: null,
    });

    await expect(
      api.generateWizardInsight({
        interval: '1d',
        limit: 100,
        stepLabel: '1D',
        promptContext: 'Analyze macro structure',
        previousInsights: [],
      })
    ).resolves.toEqual({ insight: note, analysis, meta });
  });

  it('validates candle and state SSE payloads before updating the store', () => {
    api.connectToStream();
    const source = FakeEventSource.instance!;
    expect(source.url).toBe('/api/trading/stream');

    source.emit('state', state);
    source.emit('candle', candle);
    source.emit('candleClosed', candle);
    source.emit('candle', { close: 'invalid' });

    expect(mocks.store.setTradingState).toHaveBeenCalledWith(state);
    expect(mocks.store.appendClosedCandle).toHaveBeenCalledWith(candle);
    expect(mocks.store.updateTradingState).toHaveBeenCalledTimes(2);
    expect(mocks.logError).toHaveBeenCalledWith('Trading SSE payload validation failed');
  });

  it('closes the EventSource explicitly and on stream errors', () => {
    api.connectToStream();
    const source = FakeEventSource.instance!;

    source.onerror?.();

    expect(mocks.logError).toHaveBeenCalledWith('Trading SSE connection failed');
    expect(source.close).toHaveBeenCalledOnce();
  });
});
