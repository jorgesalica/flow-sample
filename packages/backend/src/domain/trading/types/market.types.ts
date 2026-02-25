/**
 * Market state and regime types
 */

export type RegimeType = 'TRENDING' | 'RANGING' | 'MEAN_REVERTING' | 'RANDOM';

/**
 * Candle pattern detection result for LLM context.
 */
export interface CandlePatternInfo {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  significance: 'strong' | 'moderate' | 'weak';
}

export interface MarketState {
  symbol: string;
  timestamp: number;
  regime: RegimeType;
  hurst: number;
  fractalDimension: number;
  price: {
    current: number;
    open24h?: number;
    change24h?: number;
  };
  nodes: {
    all: FractalNode[];
    support: FractalNode | null;
    resistance: FractalNode | null;
    supportTouchCount?: number;
    resistanceTouchCount?: number;
  };
  indicators: {
    rsi?: number;
    macd?: {
      value: number;
      signal: number;
      histogram: number;
    };
  };
  /** Detected candle patterns in recent price action */
  candlePatterns?: CandlePatternInfo[];
}

export interface FractalNode {
  type: 'high' | 'low';
  price: number;
  candleOpenTime: number;
}
