import type { AdvisorNote, Candle, FractalNode } from '@flows/shared';
import { parseAdvisorNote } from '../domain/advisor-note';
import { AnalysisError } from '../domain/errors';
import {
  type AdvisorLogRow,
  type CandleRow,
  type FractalNodeRow,
  type TradingPersistence,
} from './database';

export interface StoredAdvisorInsight {
  insight: AdvisorNote;
  debugContext: unknown;
  timestamp: number;
  regime: string | null;
  tokensUsed: number | null;
  latencyMs: number | null;
}

export interface TradingReadRepository {
  getCandles(symbol: string, interval: string, limit: number): Candle[];
  getFractals(symbol: string, limit: number): FractalNode[];
  getLatestInsight(symbol: string): StoredAdvisorInsight | null;
}

function mapCandle(row: CandleRow): Candle {
  return {
    symbol: row.symbol,
    interval: row.interval,
    openTime: row.open_time,
    closeTime: row.close_time,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
    isClosed: true,
  };
}

function mapFractal(row: FractalNodeRow): FractalNode {
  return {
    type: row.type,
    price: row.price,
    candleOpenTime: row.candle_open_time,
  };
}

export class SqliteTradingReadRepository implements TradingReadRepository {
  constructor(private readonly persistence: TradingPersistence) {}

  getCandles(symbol: string, interval: string, limit: number): Candle[] {
    const rows = this.persistence.getLastCandles(symbol, interval, limit) as CandleRow[];
    return rows.reverse().map(mapCandle);
  }

  getFractals(symbol: string, limit: number): FractalNode[] {
    const rows = this.persistence.getLastFractalNodes(symbol, limit) as FractalNodeRow[];
    return rows.map(mapFractal);
  }

  getLatestInsight(symbol: string): StoredAdvisorInsight | null {
    const row = this.persistence.getLatestAdvisorLog(symbol) as AdvisorLogRow | null;
    if (!row) return null;

    const insight = parseAdvisorNote(row.insight_json);
    if (!insight) {
      throw new AnalysisError('Stored advisor insight is invalid');
    }

    try {
      const debugContext: unknown = row.market_state_json
        ? JSON.parse(row.market_state_json)
        : null;
      return {
        insight,
        debugContext,
        timestamp: row.timestamp,
        regime: row.regime,
        tokensUsed: row.tokens_used,
        latencyMs: row.latency_ms,
      };
    } catch {
      throw new AnalysisError('Stored market context is invalid');
    }
  }
}
