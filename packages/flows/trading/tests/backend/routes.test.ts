import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdvisorNote, Candle, TradingWizardAnalysis } from '@flows/shared';
import {
  InsightProviderError,
  InsufficientDataError,
  InvalidInsightResponseError,
  MarketDataUnavailableError,
} from '../../src/domain/errors';
import type { TradingRoutesDependencies } from '../../src/backend/routes';
import { createTradingRoutes } from '../../src/backend/routes';

const config = {
  symbol: 'BTCUSDT',
  interval: '1m',
  advisorAutoStart: false,
};

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
    nearest_resistance: 'None detected',
    distance_to_resistance: 'N/A',
    resistance_touch_count: 0,
    nearest_support: 'None detected',
    distance_to_support: 'N/A',
    support_touch_count: 0,
    active_nodes_count: 0,
  },
  candle_patterns: [],
  indicators: { rsi: 'N/A', macd: 'N/A' },
};

const dependencies = {
  trading: {
    start: vi.fn(),
    stop: vi.fn(),
    getState: vi.fn<TradingRoutesDependencies['trading']['getState']>(),
    on: vi.fn<TradingRoutesDependencies['trading']['on']>(),
    off: vi.fn<TradingRoutesDependencies['trading']['off']>(),
  },
  mentor: {
    toggle: vi.fn<TradingRoutesDependencies['mentor']['toggle']>(),
    getState: vi.fn<TradingRoutesDependencies['mentor']['getState']>(),
    generateInsight: vi.fn<TradingRoutesDependencies['mentor']['generateInsight']>(),
  },
  market: {
    getCandles: vi.fn<TradingRoutesDependencies['market']['getCandles']>(),
    getHistoricalKlines: vi.fn<TradingRoutesDependencies['market']['getHistoricalKlines']>(),
    getFractals: vi.fn<TradingRoutesDependencies['market']['getFractals']>(),
    getLatestInsight: vi.fn<TradingRoutesDependencies['market']['getLatestInsight']>(),
  },
  wizard: {
    generate: vi.fn<TradingRoutesDependencies['wizard']['generate']>(),
  },
} satisfies TradingRoutesDependencies;

function request(path: string, init?: RequestInit): Promise<Response> {
  return createTradingRoutes(config, dependencies).handle(
    new Request(`http://localhost${path}`, init),
  );
}

function post(path: string, body?: Record<string, unknown>): Promise<Response> {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Trading routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.trading.getState.mockReturnValue({
      isRunning: true,
      symbol: 'BTCUSDT',
      interval: '1m',
      lastCandle: candle,
      candleCount: 1,
      connectedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    dependencies.mentor.getState.mockReturnValue({
      isEnabled: true,
      lastInsightAt: new Date('2026-01-01T01:00:00.000Z'),
      insightCount: 1,
    });
    dependencies.mentor.toggle.mockReturnValue(false);
    dependencies.mentor.generateInsight.mockResolvedValue(note);
    dependencies.market.getCandles.mockReturnValue([candle]);
    dependencies.market.getHistoricalKlines.mockResolvedValue([candle]);
    dependencies.market.getFractals.mockReturnValue([
      { type: 'high', price: 110, candleOpenTime: 1 },
    ]);
    dependencies.market.getLatestInsight.mockReturnValue({
      insight: note,
      debugContext: { regime: 'TRENDING' },
      timestamp: 1,
      regime: 'TRENDING',
      tokensUsed: 10,
      latencyMs: 20,
    });
    dependencies.wizard.generate.mockResolvedValue({
      success: true,
      insight: note,
      analysis,
      meta: { interval: '1d', candleCount: 1, tokensUsed: 10, latencyMs: 20 },
    });
  });

  it('serializes service state and delegates start/stop controls', async () => {
    const status = await request('/api/trading/status');
    expect(status.status).toBe(200);
    await expect(status.json()).resolves.toMatchObject({
      success: true,
      trading: { connectedAt: '2026-01-01T00:00:00.000Z' },
      advisor: { lastInsightAt: '2026-01-01T01:00:00.000Z' },
    });

    const started = await post('/api/trading/start');
    const stopped = await post('/api/trading/stop');
    expect(started.status).toBe(200);
    expect(stopped.status).toBe(200);
    expect(dependencies.trading.start).toHaveBeenCalledOnce();
    expect(dependencies.trading.stop).toHaveBeenCalledOnce();
  });

  it('sanitizes start and stop control failures', async () => {
    dependencies.trading.start.mockImplementationOnce(() => {
      throw new Error('secret websocket detail');
    });
    const start = await post('/api/trading/start');
    expect(start.status).toBe(503);
    await expect(start.json()).resolves.toEqual({
      success: false,
      error: 'Market data is temporarily unavailable',
    });

    dependencies.trading.stop.mockImplementationOnce(() => {
      throw new Error('secret shutdown detail');
    });
    const stop = await post('/api/trading/stop');
    expect(stop.status).toBe(500);
    await expect(stop.json()).resolves.toEqual({
      success: false,
      error: 'Trading request failed',
    });
  });

  it('maps local candles and fractals through validated numeric queries', async () => {
    const candles = await request('/api/trading/candles?symbol=ETHUSDT&interval=5m&limit=7');
    const fractals = await request('/api/trading/fractals?symbol=ETHUSDT&limit=4');

    expect(candles.status).toBe(200);
    expect(fractals.status).toBe(200);
    expect(dependencies.market.getCandles).toHaveBeenCalledWith('ETHUSDT', '5m', 7);
    expect(dependencies.market.getFractals).toHaveBeenCalledWith('ETHUSDT', 4);
  });

  it('maps local persistence failures to stable 500 responses', async () => {
    dependencies.market.getCandles.mockImplementationOnce(() => {
      throw new Error('secret candle database detail');
    });
    dependencies.market.getFractals.mockImplementationOnce(() => {
      throw new Error('secret fractal database detail');
    });
    dependencies.market.getLatestInsight.mockImplementationOnce(() => {
      throw new Error('secret insight database detail');
    });

    for (const path of ['/api/trading/candles', '/api/trading/fractals', '/api/trading/insight']) {
      const response = await request(path);
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: 'Trading request failed',
      });
    }
  });

  it('returns the live candle and advisor state contracts', async () => {
    const live = await request('/api/trading/candles/live');
    const advisor = await request('/api/trading/advisor/status');
    const toggle = await post('/api/trading/advisor/toggle');

    await expect(live.json()).resolves.toMatchObject({
      success: true,
      candle,
      isRunning: true,
    });
    await expect(advisor.json()).resolves.toMatchObject({
      success: true,
      isEnabled: true,
      lastInsightAt: '2026-01-01T01:00:00.000Z',
    });
    await expect(toggle.json()).resolves.toEqual({
      success: true,
      active: false,
      message: 'Advisor disabled',
    });
  });

  it('returns historical klines and sanitizes market provider failures', async () => {
    const success = await request('/api/trading/klines?interval=4h&limit=20');
    expect(success.status).toBe(200);
    expect(dependencies.market.getHistoricalKlines).toHaveBeenCalledWith('BTCUSDT', '4h', 20);

    dependencies.market.getHistoricalKlines.mockRejectedValueOnce(
      new MarketDataUnavailableError('secret Binance payload'),
    );
    const failure = await request('/api/trading/klines?interval=1d');
    expect(failure.status).toBe(502);
    const body = await failure.json();
    expect(body).toEqual({
      success: false,
      error: 'Market data is temporarily unavailable',
    });
    expect(JSON.stringify(body)).not.toContain('secret Binance payload');
  });

  it('rejects unsupported historical intervals at the route boundary', async () => {
    const response = await request('/api/trading/klines?interval=2h');

    expect(response.status).toBe(422);
    expect(dependencies.market.getHistoricalKlines).not.toHaveBeenCalled();
  });

  it('returns a stable latest-insight shape for presence and absence', async () => {
    const present = await request('/api/trading/insight');
    expect(present.status).toBe(200);
    await expect(present.json()).resolves.toMatchObject({
      success: true,
      insight: note,
      debugContext: { regime: 'TRENDING' },
    });

    dependencies.market.getLatestInsight.mockReturnValueOnce(null);
    const absent = await request('/api/trading/insight');
    await expect(absent.json()).resolves.toMatchObject({
      success: true,
      insight: null,
      debugContext: null,
      timestamp: null,
    });
  });

  it('maps unavailable manual insights to 503', async () => {
    dependencies.mentor.generateInsight.mockResolvedValueOnce(null);

    const response = await post('/api/trading/insight/generate');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'AI insight is temporarily unavailable',
    });
  });

  it('returns a generated manual insight on success', async () => {
    const response = await post('/api/trading/insight/generate');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      insight: note,
      message: 'Insight generated successfully',
    });
  });

  it('passes the typed wizard body to the application', async () => {
    const response = await post('/api/trading/wizard/insight', {
      interval: '1d',
      limit: 100,
      stepLabel: '1D',
      promptContext: 'Analyze macro structure',
      previousInsights: [{ label: '4H', insight: note }],
    });

    expect(response.status).toBe(200);
    expect(dependencies.wizard.generate).toHaveBeenCalledWith({
      interval: '1d',
      limit: 100,
      stepLabel: '1D',
      promptContext: 'Analyze macro structure',
      previousInsights: [{ label: '4H', insight: note }],
    });
  });

  it.each([
    [new InsufficientDataError(), 422, 'Insufficient market data for analysis'],
    [
      new MarketDataUnavailableError('secret market detail'),
      502,
      'Market data is temporarily unavailable',
    ],
    [
      new InvalidInsightResponseError('secret malformed response'),
      502,
      'AI insight is temporarily unavailable',
    ],
    [
      new InsightProviderError('secret provider detail'),
      503,
      'AI insight is temporarily unavailable',
    ],
  ])('maps wizard failures without leaking internals', async (error, status, message) => {
    dependencies.wizard.generate.mockRejectedValueOnce(error);

    const response = await post('/api/trading/wizard/insight', {});

    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body).toEqual({ success: false, error: message });
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('maps unexpected wizard failures to a stable 500 response', async () => {
    dependencies.wizard.generate.mockRejectedValueOnce(new Error('secret internal detail'));

    const response = await post('/api/trading/wizard/insight', {});

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Trading request failed',
    });
  });

  it('removes SSE listeners when the response stream is cancelled', async () => {
    const response = await request('/api/trading/stream');
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(dependencies.trading.on).toHaveBeenCalledTimes(2);

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    const first = await reader!.read();
    expect(new TextDecoder().decode(first.value)).toContain('event: state');

    const onCandle = dependencies.trading.on.mock.calls[0][1];
    onCandle(candle);
    const update = await reader!.read();
    expect(new TextDecoder().decode(update.value)).toContain('event: candle');

    await reader!.cancel();
    expect(dependencies.trading.off).toHaveBeenCalledTimes(2);
  });
});
