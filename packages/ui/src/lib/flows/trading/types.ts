import type {
  AdvisorNote,
  AdvisorState,
  Candle,
  FractalNode,
  TradingAdvisorToggleResponse,
  TradingCandlesResponse,
  TradingFractalsResponse,
  TradingInsightResponse,
  TradingState,
  TradingStateResponse,
  TradingStatusResponse,
  TradingWizardAnalysis,
  TradingWizardInsightResponse,
} from '@flows/shared';

export type StatusResponse = TradingStatusResponse;
export type StateResponse = TradingStateResponse;
export type CandlesResponse = TradingCandlesResponse;
export type FractalsResponse = TradingFractalsResponse;
export type AdvisorToggleResponse = TradingAdvisorToggleResponse;
export type InsightResponse = TradingInsightResponse;
export type WizardInsightResponse = TradingWizardInsightResponse;
export type WizardAnalysis = TradingWizardAnalysis;

export interface WizardInsightViewModel {
  insight: AdvisorNote;
  analysis: TradingWizardAnalysis;
}

export interface TradingPageData {
  trading: TradingState | null;
  advisor: AdvisorState | null;
  candles: Candle[];
  insight: (AdvisorNote & { _debugContext?: unknown }) | null;
}

export type { AdvisorNote, AdvisorState, Candle, FractalNode, TradingState };
