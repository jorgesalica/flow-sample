import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdvisorNote, Candle, FractalNode } from '@flows/shared';
import { MarketDataUnavailableError } from '../../src/domain/errors';
import type { TradingReadRepository } from '../../src/backend/repository';
import {
  TradingMarketService,
  type HistoricalMarketDataPort,
} from '../../src/backend/services/market.service';

const candle: Candle = {
  symbol: 'BTCUSDT',
  interval: '1d',
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
  regime_context: 'Trending',
  scenario_bullish: 'Break resistance',
  scenario_bearish: 'Lose support',
  mentor_tip: 'Wait for confirmation',
  reasoning_key_factors: ['Hurst'],
  confidence_score: 70,
};

const fractal: FractalNode = { type: 'high', price: 110, candleOpenTime: 1 };

const repository = {
  getCandles: vi.fn<TradingReadRepository['getCandles']>(),
  getFractals: vi.fn<TradingReadRepository['getFractals']>(),
  getLatestInsight: vi.fn<TradingReadRepository['getLatestInsight']>(),
};
const historicalSource = {
  fetchKlines: vi.fn<HistoricalMarketDataPort['fetchKlines']>(),
};

describe('TradingMarketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.getCandles.mockReturnValue([candle]);
    repository.getFractals.mockReturnValue([fractal]);
    repository.getLatestInsight.mockReturnValue({
      insight: note,
      debugContext: { regime: 'TRENDING' },
      timestamp: 1,
      regime: 'TRENDING',
      tokensUsed: 10,
      latencyMs: 20,
    });
    historicalSource.fetchKlines.mockResolvedValue([candle]);
  });

  it('delegates local market reads to the repository', () => {
    const service = new TradingMarketService(repository, historicalSource);

    expect(service.getCandles('BTCUSDT', '1m', 10)).toEqual([candle]);
    expect(service.getFractals('BTCUSDT', 5)).toEqual([fractal]);
    expect(service.getLatestInsight('BTCUSDT')?.insight).toEqual(note);
    expect(repository.getCandles).toHaveBeenCalledWith('BTCUSDT', '1m', 10);
    expect(repository.getFractals).toHaveBeenCalledWith('BTCUSDT', 5);
    expect(repository.getLatestInsight).toHaveBeenCalledWith('BTCUSDT');
  });

  it('fetches historical klines through the injected port', async () => {
    const service = new TradingMarketService(repository, historicalSource);

    await expect(service.getHistoricalKlines('ETHUSDT', '4h', 200)).resolves.toEqual([candle]);
    expect(historicalSource.fetchKlines).toHaveBeenCalledWith('ETHUSDT', '4h', 200);
  });

  it('wraps external market failures without exposing provider details', async () => {
    historicalSource.fetchKlines.mockRejectedValue(new Error('Binance secret response payload'));
    const service = new TradingMarketService(repository, historicalSource);

    const result = service.getHistoricalKlines('BTCUSDT', '1d', 100);
    await expect(result).rejects.toBeInstanceOf(MarketDataUnavailableError);
    await expect(result).rejects.not.toThrow('Binance secret response payload');
  });
});
