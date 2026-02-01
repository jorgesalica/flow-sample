import type { MarketState } from './analyst.service';
import type { LLMMessage } from '@infra/llm';

/**
 * System prompt for the Trading Mentor (El Capitán)
 */
const MENTOR_SYSTEM_PROMPT = `You are "El Capitán", an educational trading mentor. Your role is to help users understand market dynamics, NOT to give financial advice.

IMPORTANT: Respond ONLY with a valid JSON object matching this EXACT schema (no markdown, no explanation):

{
  "title": "Short title (max 10 words)",
  "regime_context": "1-2 sentences explaining the current regime",
  "scenario_bullish": "1-2 sentences on bullish case",
  "scenario_bearish": "1-2 sentences on bearish case",
  "mentor_tip": "1 actionable educational tip about risk/psychology"
}

Keep each field SHORT. Total response under 300 tokens.`;

/**
 * SynthesizerService (N4): Transforms MarketState into LLM prompts.
 *
 * Constructs system prompt + user content for the Mentor LLM.
 */
export class SynthesizerService {
  /**
   * Build LLM messages from market state.
   */
  buildMessages(state: MarketState): LLMMessage[] {
    const userContent = this.formatMarketState(state);

    return [
      { role: 'system', content: MENTOR_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ];
  }

  /**
   * Format market state as structured JSON for the LLM.
   */
  private formatMarketState(state: MarketState): string {
    const data = {
      symbol: state.symbol,
      timestamp: new Date(state.timestamp).toISOString(),
      price: {
        current: state.price.current,
        change_24h_percent: state.price.change24h?.toFixed(2) || null,
      },
      regime: {
        classification: state.regime,
        hurst_exponent: state.hurst.toFixed(3),
        fractal_dimension: state.fractalDimension.toFixed(3),
      },
      fractal_structure: {
        nearest_resistance: state.nodes.resistance?.price || null,
        nearest_support: state.nodes.support?.price || null,
        active_nodes_count: state.nodes.all.length,
      },
      indicators: state.indicators,
    };

    return `Analyze this market state and provide educational insights:\n\n${JSON.stringify(data, null, 2)}`;
  }
}

// Singleton
let synthesizerInstance: SynthesizerService | null = null;

export function getSynthesizerService(): SynthesizerService {
  if (!synthesizerInstance) {
    synthesizerInstance = new SynthesizerService();
  }
  return synthesizerInstance;
}

export default SynthesizerService;
