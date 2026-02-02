import { type MarketState } from '@domain/trading/types';
import type { LLMMessage } from '@infra/llm';

/**
 * System prompt for the Trading Mentor (El Capitán v2.0)
 * Focused on specific, data-driven analysis over generic advice.
 */
const MENTOR_SYSTEM_PROMPT = `You are "El Capitán", a Quantitative Market Analyst.
Your goal is to provide specific, data-driven educational insights based PURELY on the provided market state.

CRITICAL RULES:
1. NO GENERIC ADVICE. Never say "set stop losses" or "manage risk" without tying it to specific levels in the data.
2. BE SPECIFIC. If you mention resistance, you MUST cite the EXACT PRICE from the 'fractal_structure'.
3. BE ANALYTICAL. Connect the dots: e.g., "High Hurst (0.75) + Price near Support indicates a potential trend bounce."
4. TONE: Professional, concise, observational. Not enthusiastic or salesy.

RESPONSE FORMAT (JSON ONLY, no markdown):
{
  "title": "Short, punchy title (max 8 words) describing the immediate context",
  "regime_context": "Explain the regime (Trending/Ranging) citing Hurst/FD values. What does the math say?",
  "scenario_bullish": "What needs to happen for price to go up? Cite nearest RESISTANCE price.",
  "scenario_bearish": "What invalidates the trend? Cite nearest SUPPORT price.",
  "mentor_tip": "A specific educational insight about the CURRENT setup (e.g. 'In highhurst regimes, breakouts are more likely to sustain').",
  "reasoning_key_factors": ["List 2-3 key data points used", "e.g. 'Hurst > 0.6'", "e.g. 'Price within 1% of Support'"],
  "confidence_score": 0-100 (integer represent confidence in the regime clarity)
}`;

/**
 * SynthesizerService (N4): Transforms MarketState into LLM prompts.
 *
 * Constructs system prompt + user content for the Mentor LLM.
 * Enhances raw state with derived metrics (distances, percentages) for better LLM reasoning.
 */
export class SynthesizerService {
  /**
   * Build LLM messages from market state.
   * Returns messages AND the raw context JSON for debugging/transparency.
   */
  buildMessages(state: MarketState): { messages: LLMMessage[]; contextJson: string } {
    const enrichedData = this.enrichMarketState(state);
    const contextJson = JSON.stringify(enrichedData, null, 2);
    const userContent = `Analyze this market state:\n\n${contextJson}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: MENTOR_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ];

    return { messages, contextJson };
  }

  /**
   * Enrich raw market state with derived metrics for the LLM.
   * Exposed public for debugging if needed.
   */
  public enrichMarketState(state: MarketState): Record<string, any> {
    const currentPrice = state.price.current;

    // Calculate distances to levels
    const distToResistance = state.nodes.resistance
      ? ((state.nodes.resistance.price - currentPrice) / currentPrice) * 100
      : null;

    const distToSupport = state.nodes.support
      ? ((currentPrice - state.nodes.support.price) / currentPrice) * 100
      : null;

    return {
      market_context: {
        symbol: state.symbol,
        timestamp: new Date(state.timestamp).toISOString(),
        price: currentPrice,
        price_change_24h_percent: state.price.change24h?.toFixed(2) + '%',
      },
      regime_analysis: {
        classification: state.regime,
        hurst_exponent: state.hurst.toFixed(3),
        fractal_dimension: state.fractalDimension.toFixed(3),
        interpretation: this.interpretHurst(state.hurst),
      },
      fractal_structure: {
        nearest_resistance: state.nodes.resistance?.price || 'None detected',
        distance_to_resistance: distToResistance ? `+${distToResistance.toFixed(2)}%` : 'N/A',
        nearest_support: state.nodes.support?.price || 'None detected',
        distance_to_support: distToSupport ? `-${distToSupport.toFixed(2)}%` : 'N/A',
        active_nodes_count: state.nodes.all.length,
      },
      indicators: {
        rsi: state.indicators.rsi?.toFixed(1) || 'N/A',
        macd: state.indicators.macd ? {
          value: state.indicators.macd.value.toFixed(4),
          signal: state.indicators.macd.signal.toFixed(4),
          histogram: state.indicators.macd.histogram.toFixed(4),
          bias: state.indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'
        } : 'N/A'
      },
    };
  }

  private interpretHurst(h: number): string {
    if (h > 0.6) return 'Strong Persistency (Trending)';
    if (h < 0.4) return 'Anti-Persistency (Mean Reverting/Choppy)';
    return 'Random Walk / Noise';
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
