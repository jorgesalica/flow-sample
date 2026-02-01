import {
  calculateHurst,
  classifyRegime,
  calculateFractalDimension,
  detectFractals,
  findNearestResistance,
  findNearestSupport,
  type Candle,
} from '@domain/trading/math';
import { type MarketState } from '@domain/trading/types';
import {
  getLastNCandles,
  insertFractalNode,
  type CandleRow,
} from '@infra/persistence/sqlite/trading-database';
import { TRADING_CONFIG } from '@config/trading.config';
import { RSI, MACD } from 'technicalindicators';

// Re-export types for convenience
export type { MarketState } from '@domain/trading/types';
import { InsufficientDataError } from '@domain/trading/errors';

export interface AnalystServiceConfig {
  symbol: string;
  interval: string;
  hurstWindowSize: number;
  candleLookback: number;
}

/**
 * AnalystService (N3): The Fractal State Machine
 *
 * Analyzes market structure using:
 * - Hurst exponent for regime detection
 * - Bill Williams fractals for support/resistance
 * - Conditional indicators (RSI for ranging, MACD for trending)
 */
export class AnalystService {
  private config: AnalystServiceConfig;

  constructor(config?: Partial<AnalystServiceConfig>) {
    this.config = {
      symbol: config?.symbol || process.env.TRADING_SYMBOL || 'BTCUSDT',
      interval: config?.interval || process.env.TRADING_INTERVAL || '1m',
      hurstWindowSize: config?.hurstWindowSize || TRADING_CONFIG.HURST.WINDOW_SIZE,
      candleLookback: config?.candleLookback || 500,
    };
  }

  /**
   * Analyze current market state.
   * Called after each candle closes.
   *
   * @returns MarketState if successful, null if insufficient data
   * @throws InsufficientDataError if critical data is missing (not currently thrown, but prepared)
   */
  analyze(): MarketState | null {
    // Fetch recent candles
    const candleRows = getLastNCandles.all(
      this.config.symbol,
      this.config.interval,
      this.config.candleLookback,
    ) as CandleRow[];

    if (candleRows.length < TRADING_CONFIG.CANDLES.MIN_FOR_ANALYSIS) {
      const error = new InsufficientDataError(
        `Not enough candles for analysis. Need ${TRADING_CONFIG.CANDLES.MIN_FOR_ANALYSIS}, got ${candleRows.length}`,
      );
      console.warn(`[AnalystService] ${error.message}`);
      return null;
    }

    // Convert to Candle format and reverse to chronological order
    const candles: Candle[] = candleRows.reverse().map((row) => ({
      openTime: row.open_time,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
    }));

    const closes = candles.map((c) => c.close);
    const currentPrice = closes[closes.length - 1];

    // Calculate Hurst exponent
    const hurst = calculateHurst(closes, 10, Math.min(100, Math.floor(closes.length / 2)));
    const regime = classifyRegime(hurst);
    const fractalDimension = calculateFractalDimension(hurst);

    // Detect fractals
    const fractals = detectFractals(candles);

    // Persist new fractals to database
    const recentFractals = fractals.slice(-20);
    for (const fractal of recentFractals) {
      try {
        insertFractalNode.run({
          symbol: this.config.symbol,
          type: fractal.type,
          price: fractal.price,
          candleOpenTime: fractal.candleOpenTime,
          detectedAt: Date.now(),
        });
      } catch {
        // Ignore duplicates (UNIQUE constraint)
      }
    }

    const resistance = findNearestResistance(fractals, currentPrice);
    const support = findNearestSupport(fractals, currentPrice);

    // Calculate conditional indicators based on regime
    const indicators: MarketState['indicators'] = {};

    if (regime === 'RANGING') {
      // Use RSI for ranging markets
      const rsiResult = RSI.calculate({
        values: closes,
        period: 14,
      });
      if (rsiResult.length > 0) {
        indicators.rsi = rsiResult[rsiResult.length - 1];
      }
    } else if (regime === 'TRENDING') {
      // Use MACD for trending markets
      const macdResult = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });
      if (macdResult.length > 0) {
        const last = macdResult[macdResult.length - 1];
        if (last.MACD !== undefined && last.signal !== undefined && last.histogram !== undefined) {
          indicators.macd = {
            value: last.MACD,
            signal: last.signal,
            histogram: last.histogram,
          };
        }
      }
    }

    // Calculate 24h price change if we have enough data
    let open24h: number | undefined;
    let change24h: number | undefined;
    if (candles.length >= 1440) {
      // 1440 one-minute candles = 24 hours
      open24h = candles[candles.length - 1440].open;
      change24h = ((currentPrice - open24h) / open24h) * 100;
    }

    const marketState: MarketState = {
      symbol: this.config.symbol,
      timestamp: Date.now(),
      regime,
      hurst,
      fractalDimension,
      price: {
        current: currentPrice,
        open24h,
        change24h,
      },
      nodes: {
        all: recentFractals,
        resistance,
        support,
      },
      indicators,
    };

    console.log(
      `[AnalystService] Regime: ${regime} (H=${hurst.toFixed(3)}) | Price: ${currentPrice.toFixed(2)} | Fractals: ${recentFractals.length}`,
    );

    return marketState;
  }
}

// Singleton instance
let analystServiceInstance: AnalystService | null = null;

export function getAnalystService(config?: Partial<AnalystServiceConfig>): AnalystService {
  if (!analystServiceInstance) {
    analystServiceInstance = new AnalystService(config);
  }
  return analystServiceInstance;
}

export default AnalystService;
