import {
  calculateHurst,
  classifyRegime,
  calculateFractalDimension,
  detectFractals,
  findNearestResistance,
  findNearestSupport,
  calculateTouchCounts,
  detectCandlePatterns,
  type Candle,
} from '../../domain/math';
import { type MarketState, type FractalNode } from '../../domain/types';
import { type CandleRow, type TradingPersistence } from '../database';
import { TRADING_CONFIG } from '../config';
import { RSI, MACD } from 'technicalindicators';

// Re-export types for convenience
export type { MarketState } from '../../domain/types';
import { InsufficientDataError } from '../../domain/errors';
import { logger } from '@flows/core';

const log = logger.child({ module: 'AnalystService' });

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

  constructor(
    private readonly persistence: TradingPersistence,
    config?: Partial<AnalystServiceConfig>,
  ) {
    this.config = {
      symbol: config?.symbol || TRADING_CONFIG.DEFAULTS.SYMBOL,
      interval: config?.interval || TRADING_CONFIG.DEFAULTS.INTERVAL,
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
    const candleRows = this.persistence.getLastCandles(
      this.config.symbol,
      this.config.interval,
      this.config.candleLookback,
    ) as CandleRow[];

    if (candleRows.length < TRADING_CONFIG.CANDLES.MIN_FOR_ANALYSIS) {
      log.warn(
        { needed: TRADING_CONFIG.CANDLES.MIN_FOR_ANALYSIS, got: candleRows.length },
        'Not enough candles for analysis',
      );
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

    return AnalystService.analyzeCandles(candles, this.config.symbol, (fractals) => {
      // Persist fractals to database (only for stream pipeline, not wizard)
      for (const fractal of fractals) {
        try {
          this.persistence.insertFractalNode({
            symbol: this.config.symbol,
            type: fractal.type,
            price: fractal.price,
            candleOpenTime: fractal.candleOpenTime,
            detectedAt: Date.now(),
          });
        } catch (error: unknown) {
          if (!(error instanceof Error) || !error.message.includes('UNIQUE constraint failed')) {
            throw error;
          }
        }
      }
    });
  }

  /**
   * Analyze an externally-provided array of candles.
   * Used by the Cascade Wizard to analyze klines fetched from Binance REST API
   * instead of the local SQLite stream data.
   *
   * Computes ALL indicators (RSI + MACD) regardless of regime so the wizard
   * can display the full picture.
   *
   * @param candles Array of candles in chronological order (oldest first)
   * @param symbol Trading pair symbol
   * @returns MarketState if successful, null if insufficient data
   */
  static analyzeCandles(
    candles: Candle[],
    symbol: string,
    onFractalsDetected?: (fractals: FractalNode[]) => void,
  ): MarketState | null {
    if (candles.length < TRADING_CONFIG.CANDLES.MIN_FOR_ANALYSIS) {
      log.warn(
        { needed: TRADING_CONFIG.CANDLES.MIN_FOR_ANALYSIS, got: candles.length },
        'Not enough candles for analysis',
      );
      return null;
    }

    const closes = candles.map((c) => c.close);
    const currentPrice = closes[closes.length - 1];

    // Calculate Hurst exponent
    const hurst = calculateHurst(closes, 10, Math.min(100, Math.floor(closes.length / 2)));
    const regime = classifyRegime(hurst);
    const fractalDimension = calculateFractalDimension(hurst);

    // Detect fractals
    const fractals = detectFractals(candles);
    const recentFractals = fractals.slice(-20);

    // Allow caller to persist fractals (used by stream pipeline)
    if (onFractalsDetected) {
      onFractalsDetected(recentFractals);
    }

    const resistance = findNearestResistance(fractals, currentPrice);
    const support = findNearestSupport(fractals, currentPrice);

    // Calculate ALL indicators (wizard always shows the full picture)
    const indicators: MarketState['indicators'] = {};

    // RSI
    const rsiResult = RSI.calculate({
      values: closes,
      period: 14,
    });
    if (rsiResult.length > 0) {
      indicators.rsi = rsiResult[rsiResult.length - 1];
    }

    // MACD
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

    // Price change: first candle open vs last candle close
    const openFirst = candles[0].open;
    const changePeriod = ((currentPrice - openFirst) / openFirst) * 100;

    // Detect candle patterns
    const candlePatterns = detectCandlePatterns(candles);

    // Calculate touch counts for S/R levels
    const fractalsWithTouches = calculateTouchCounts(fractals, candles);
    const supportTouchCount = support
      ? (fractalsWithTouches.find((f) => f.price === support.price)?.touchCount ?? 0)
      : 0;
    const resistanceTouchCount = resistance
      ? (fractalsWithTouches.find((f) => f.price === resistance.price)?.touchCount ?? 0)
      : 0;

    const marketState: MarketState = {
      symbol,
      timestamp: Date.now(),
      regime,
      hurst,
      fractalDimension,
      price: {
        current: currentPrice,
        open24h: openFirst,
        change24h: changePeriod,
      },
      nodes: {
        all: recentFractals,
        resistance,
        support,
        supportTouchCount,
        resistanceTouchCount,
      },
      indicators,
      candlePatterns,
    };

    return marketState;
  }
}

// Singleton instance
let analystServiceInstance: AnalystService | null = null;

export function getAnalystService(
  persistence: TradingPersistence,
  config?: Partial<AnalystServiceConfig>,
): AnalystService {
  if (!analystServiceInstance) {
    analystServiceInstance = new AnalystService(persistence, config);
  }
  return analystServiceInstance;
}

export default AnalystService;
