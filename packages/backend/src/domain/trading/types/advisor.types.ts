/**
 * LLM advisor types
 */

export interface AdvisorNote {
  title: string;
  regime_context: string;
  scenario_bullish: string;
  scenario_bearish: string;
  mentor_tip: string;
}

export interface AdvisorState {
  isEnabled: boolean;
  lastGenerated: Date | null;
}
