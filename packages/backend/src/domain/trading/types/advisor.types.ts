/**
 * LLM advisor types
 */

export interface AdvisorNote {
  title: string;
  regime_context: string;
  scenario_bullish: string;
  scenario_bearish: string;
  mentor_tip: string;
  /** List of key data points driving this analysis (e.g., "Hurst 0.75 (Trending)", "Price at Resistance") */
  reasoning_key_factors: string[];
  /** Confidence in the assessment (0-100) based on data convergence */
  confidence_score: number;
}

export interface AdvisorState {
  isEnabled: boolean;
  lastGenerated: Date | null;
}
