/**
 * Market state and regime types
 */

export type RegimeType = 'TRENDING' | 'RANGING' | 'MEAN_REVERTING' | 'RANDOM';

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
  };
  indicators: {
    rsi?: number;
    macd?: {
      value: number;
      signal: number;
      histogram: number;
    };
  };
}

export interface FractalNode {
  type: 'high' | 'low';
  price: number;
  candleOpenTime: number;
}
