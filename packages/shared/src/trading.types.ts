/**
 * Trading Flow Types
 *
 * Consolidated from backend domain + UI duplicates.
 * Single source of truth for all trading-related types.
 */

// ============================================
// Market Data
// ============================================

export interface Candle {
  symbol: string;
  interval: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface FractalNode {
  type: 'high' | 'low';
  price: number;
  candleOpenTime: number;
}

export type RegimeType = 'TRENDING' | 'RANGING' | 'MEAN_REVERTING' | 'RANDOM';

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

// ============================================
// Advisor / LLM
// ============================================

export type SentimentBias = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface RiskManagement {
  recommended_sl: number;
  invalidation_reason: string;
}

export interface AdvisorNote {
  title: string;
  sentiment_bias?: SentimentBias;
  regime_context: string;
  scenario_bullish: string;
  scenario_bearish: string;
  risk_management?: RiskManagement;
  mentor_tip: string;
  reasoning_key_factors: string[];
  confidence_score: number;
}

// ============================================
// UI State
// ============================================

export interface TradingState {
  isRunning: boolean;
  symbol: string;
  interval: string;
  lastCandle: Candle | null;
  candleCount: number;
  connectedAt: string | null;
}

export interface AdvisorState {
  isEnabled: boolean;
  lastInsightAt: string | null;
  insightCount: number;
}

// ============================================
// HTTP Contracts
// ============================================

export const TRADING_KLINE_INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as const;

export type TradingKlineInterval = (typeof TRADING_KLINE_INTERVALS)[number];

export interface TradingPreviousInsight {
  label: string;
  insight: AdvisorNote;
}

export interface TradingWizardInsightRequest {
  symbol?: string;
  interval?: TradingKlineInterval;
  limit?: number;
  stepLabel?: string;
  promptContext?: string;
  previousInsights?: TradingPreviousInsight[];
}

export interface TradingWizardAnalysis {
  market_context: {
    symbol: string;
    timestamp: string;
    price: number;
    price_change_24h_percent: string;
  };
  regime_analysis: {
    classification: RegimeType;
    hurst_exponent: string;
    fractal_dimension: string;
    interpretation: string;
  };
  fractal_structure: {
    nearest_resistance: number | string;
    distance_to_resistance: string;
    resistance_touch_count: number;
    nearest_support: number | string;
    distance_to_support: string;
    support_touch_count: number;
    active_nodes_count: number;
  };
  candle_patterns: string[];
  indicators: {
    rsi: string;
    macd:
      | {
          value: string;
          signal: string;
          histogram: string;
          bias: 'Bullish' | 'Bearish';
        }
      | 'N/A';
  };
}

export interface TradingWizardInsightMeta {
  interval: TradingKlineInterval;
  candleCount: number;
  tokensUsed: number;
  latencyMs: number;
}

export interface TradingStatusResponse {
  success: true;
  trading: TradingState;
  advisor: AdvisorState;
}

export interface TradingStateResponse {
  success: true;
  message: string;
  state: TradingState;
}

export interface TradingCandlesResponse {
  success: true;
  count: number;
  candles: Candle[];
}

export interface TradingKlinesResponse extends TradingCandlesResponse {
  symbol: string;
  interval: TradingKlineInterval;
}

export interface TradingLiveCandleResponse {
  success: true;
  candle: Candle | null;
  isRunning: boolean;
}

export interface TradingFractalsResponse {
  success: true;
  count: number;
  nodes: FractalNode[];
}

export interface TradingAdvisorToggleResponse {
  success: true;
  active: boolean;
  message: string;
}

export interface TradingAdvisorStatusResponse extends AdvisorState {
  success: true;
}

export interface TradingInsightResponse {
  success: true;
  insight: AdvisorNote | null;
  debugContext: unknown;
  timestamp: number | null;
  regime: string | null;
  tokensUsed: number | null;
  latencyMs: number | null;
  message?: string;
}

export interface TradingGeneratedInsightResponse {
  success: true;
  insight: AdvisorNote;
  message: string;
}

export interface TradingWizardInsightResponse {
  success: true;
  insight: AdvisorNote;
  analysis: TradingWizardAnalysis;
  meta: TradingWizardInsightMeta;
}

export interface TradingErrorResponse {
  success: false;
  error: string;
}
