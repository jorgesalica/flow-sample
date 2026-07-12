// Trading Flow Response Types
import type { Candle, AdvisorNote, TradingState, AdvisorState, FractalNode } from '@flows/shared';

export interface StatusResponse {
  trading: TradingState;
  advisor: AdvisorState;
}

export interface StateResponse {
  state: TradingState;
  message: string;
}

export interface CandlesResponse {
  candles: Candle[];
}

export interface FractalsResponse {
  nodes: FractalNode[];
}

export interface AdvisorToggleResponse {
  active: boolean;
  message: string;
}

export interface InsightResponse {
  success?: boolean;
  insight?: AdvisorNote & { _debugContext?: unknown };
  debugContext?: unknown;
  error?: string;
}

export interface WizardInsightResponse {
  success: boolean;
  insight?: AdvisorNote;
  analysis?: WizardAnalysis;
  meta?: Record<string, unknown>;
  error?: string;
}

export interface WizardAnalysis {
  regime_analysis?: {
    classification: string;
    hurst_exponent: number;
    fractal_dimension: number;
  };
  fractal_structure?: {
    nearest_resistance: string | number;
    distance_to_resistance: string;
    nearest_support: string | number;
    distance_to_support: string;
    support_touch_count: number;
    resistance_touch_count: number;
  };
  indicators?: {
    rsi?: string;
    macd?: { histogram: string; bias: string };
  };
  candle_patterns?: string[];
}

export interface WizardInsightViewModel {
  insight: AdvisorNote;
  analysis: WizardAnalysis;
}

/**
 * Shape returned by the trading universal loader (`+page.ts`) — the initial
 * status/candles/insight snapshot that previously hydrated in `onMount`.
 */
export interface TradingPageData {
  trading: TradingState | null;
  advisor: AdvisorState | null;
  candles: Candle[];
  insight: (AdvisorNote & { _debugContext?: unknown }) | null;
}
