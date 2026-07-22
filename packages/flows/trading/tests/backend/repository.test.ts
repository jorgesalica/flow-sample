import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisError } from '../../src/domain/errors';
import type { TradingPersistence } from '../../src/backend/database';

const getLastNCandlesAll = vi.fn();
const getLastNFractalNodesAll = vi.fn();
const getLatestAdvisorLogGet = vi.fn();

const persistence: TradingPersistence = {
  getLastCandles: (symbol, interval, limit) =>
    getLastNCandlesAll(symbol, interval, limit),
  getLastFractalNodes: (symbol, limit) =>
    getLastNFractalNodesAll(symbol, limit),
  getLatestAdvisorLog: (symbol) => getLatestAdvisorLogGet(symbol) ?? null,
  upsertCandle: vi.fn(),
  getLastCandle: vi.fn(() => null),
  getCandleCount: vi.fn(() => 0),
  insertFractalNode: vi.fn(),
  insertAdvisorLog: vi.fn(),
};

const repositoryModule = await import('../../src/backend/repository');

class SqliteTradingReadRepository extends repositoryModule.SqliteTradingReadRepository {
  constructor() {
    super(persistence);
  }
}

const note = {
  title: 'Trend intact',
  regime_context: 'Trending',
  scenario_bullish: 'Break resistance',
  scenario_bearish: 'Lose support',
  mentor_tip: 'Wait for confirmation',
  reasoning_key_factors: ['Hurst'],
  confidence_score: 70,
};

describe('SqliteTradingReadRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps and orders persisted candle rows for the wire contract', () => {
    getLastNCandlesAll.mockReturnValue([
      {
        id: 2,
        symbol: 'BTCUSDT',
        interval: '1m',
        open_time: 2,
        close_time: 3,
        open: 101,
        high: 111,
        low: 91,
        close: 106,
        volume: 13,
      },
      {
        id: 1,
        symbol: 'BTCUSDT',
        interval: '1m',
        open_time: 1,
        close_time: 2,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 12,
      },
    ]);

    const candles = new SqliteTradingReadRepository().getCandles('BTCUSDT', '1m', 2);

    expect(candles.map((candle) => candle.openTime)).toEqual([1, 2]);
    expect(candles[0]).toMatchObject({ isClosed: true, closeTime: 2 });
  });

  it('maps fractal persistence fields to the shared DTO', () => {
    getLastNFractalNodesAll.mockReturnValue([
      {
        id: 1,
        symbol: 'BTCUSDT',
        type: 'high',
        price: 110,
        candle_open_time: 7,
        detected_at: 8,
      },
    ]);

    expect(new SqliteTradingReadRepository().getFractals('BTCUSDT', 1)).toEqual([
      { type: 'high', price: 110, candleOpenTime: 7 },
    ]);
  });

  it('parses a stored insight and its debug context', () => {
    getLatestAdvisorLogGet.mockReturnValue({
      insight_json: JSON.stringify(note),
      market_state_json: JSON.stringify({ regime: 'TRENDING' }),
      timestamp: 1,
      regime: 'TRENDING',
      tokens_used: 10,
      latency_ms: 20,
    });

    expect(new SqliteTradingReadRepository().getLatestInsight('BTCUSDT')).toEqual({
      insight: note,
      debugContext: { regime: 'TRENDING' },
      timestamp: 1,
      regime: 'TRENDING',
      tokensUsed: 10,
      latencyMs: 20,
    });
  });

  it('returns null for absence and rejects malformed stored JSON', () => {
    getLatestAdvisorLogGet.mockReturnValueOnce(null);
    expect(new SqliteTradingReadRepository().getLatestInsight('BTCUSDT')).toBeNull();

    getLatestAdvisorLogGet.mockReturnValueOnce({
      insight_json: '{invalid',
      market_state_json: null,
    });
    expect(() =>
      new SqliteTradingReadRepository().getLatestInsight('BTCUSDT'),
    ).toThrow(AnalysisError);
  });
});
