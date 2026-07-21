import { logger } from '@flows/core';
import type {
  Candle,
  FractalNode,
  TradingKlineInterval,
} from '@flows/shared';
import { MarketDataUnavailableError } from '../../domain/errors';
import type {
  StoredAdvisorInsight,
  TradingReadRepository,
} from '../repository';

const log = logger.child({ module: 'TradingMarketService' });

export interface HistoricalMarketDataPort {
  fetchKlines(
    symbol: string,
    interval: TradingKlineInterval,
    limit: number,
  ): Promise<Candle[]>;
}

export interface TradingMarketApplication {
  getCandles(symbol: string, interval: string, limit: number): Candle[];
  getHistoricalKlines(
    symbol: string,
    interval: TradingKlineInterval,
    limit: number,
  ): Promise<Candle[]>;
  getFractals(symbol: string, limit: number): FractalNode[];
  getLatestInsight(symbol: string): StoredAdvisorInsight | null;
}

export class TradingMarketService implements TradingMarketApplication {
  constructor(
    private readonly repository: TradingReadRepository,
    private readonly historicalSource: HistoricalMarketDataPort,
  ) {}

  getCandles(symbol: string, interval: string, limit: number): Candle[] {
    return this.repository.getCandles(symbol, interval, limit);
  }

  async getHistoricalKlines(
    symbol: string,
    interval: TradingKlineInterval,
    limit: number,
  ): Promise<Candle[]> {
    try {
      return await this.historicalSource.fetchKlines(symbol, interval, limit);
    } catch (error) {
      log.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Historical market data fetch failed',
      );
      throw new MarketDataUnavailableError();
    }
  }

  getFractals(symbol: string, limit: number): FractalNode[] {
    return this.repository.getFractals(symbol, limit);
  }

  getLatestInsight(symbol: string): StoredAdvisorInsight | null {
    return this.repository.getLatestInsight(symbol);
  }
}
