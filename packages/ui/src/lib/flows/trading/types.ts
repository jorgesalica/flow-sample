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
  analysis?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: string;
}
