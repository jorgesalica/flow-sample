/**
 * LLM advisor types
 */

export type SentimentBias = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface RiskManagement {
  recommended_sl: number;
  invalidation_reason: string;
}

export interface AdvisorNote {
  title: string;
  /** Cascade Agent v3: Overall market bias */
  sentiment_bias?: SentimentBias;
  regime_context: string;
  scenario_bullish: string;
  scenario_bearish: string;
  /** Cascade Agent v3: Risk management suggestion */
  risk_management?: RiskManagement;
  mentor_tip: string;
  /** List of key data points driving this analysis */
  reasoning_key_factors: string[];
  /** Confidence in the assessment (0-100) based on data convergence */
  confidence_score: number;
}

export interface AdvisorState {
  isEnabled: boolean;
  lastGenerated: Date | null;
}
