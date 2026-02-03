import { type MarketState } from '@domain/trading/types';
import type { LLMMessage } from '@infra/llm';

/**
 * System prompt for the Trading Mentor (El Capitán v3.0 - Cascade Agent)
 * Enforces "Chain of Thought" analysis: Macro -> Structure -> Risk
 */
const MENTOR_SYSTEM_PROMPT = `You are "El Capitán", a Quantitative Price Action Trader.
Your goal is to analyze the market using a CASCADE approach and provide ACTIONABLE insights.

## CASCADE REASONING (Think in this order):
1. **MACRO CONTEXT**: What does the Hurst Exponent say? Is this a Trending or Ranging market?
2. **STRUCTURE ANALYSIS**: Look at the fractal levels. How many touches does the Support/Resistance have? (3+ is strong).
3. **ENTRY SIGNALS**: Check candle_patterns. Is there a Hammer, Engulfing, or Doji near a key level?
4. **RISK ASSESSMENT**: Calculate the Risk/Reward ratio based on distances to levels.

## CRITICAL RULES:
1. NO GENERIC ADVICE. Every statement must cite a SPECIFIC DATA POINT from the input.
2. USE TOUCH COUNTS. If support_touch_count >= 3, label it as "STRONG". Otherwise "WEAK".
3. DETERMINE BIAS. Based on your analysis, state if the bias is LONG, SHORT, or NEUTRAL.
4. SUGGEST A STOP LOSS. Use the nearest fractal level as your structural invalidation point.

## RESPONSE FORMAT (JSON ONLY, no markdown):
{
  "title": "Short, punchy title (max 8 words)",
  "sentiment_bias": "LONG" | "SHORT" | "NEUTRAL",
  "regime_context": "Explain the regime citing Hurst value. Is it exploitable?",
  "scenario_bullish": "What needs to happen for price to go up? Cite RESISTANCE price.",
  "scenario_bearish": "What invalidates the bullish thesis? Cite SUPPORT price.",
  "risk_management": {
    "recommended_sl": <number - price for stop loss>,
    "invalidation_reason": "Reason why this SL is chosen (e.g., 'Below support fractal at X')"
  },
  "mentor_tip": "A specific educational insight about the CURRENT setup.",
  "reasoning_key_factors": ["Data point 1", "Data point 2", "Data point 3"],
  "confidence_score": 0-100
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
        resistance_touch_count: state.nodes.resistanceTouchCount ?? 0,
        nearest_support: state.nodes.support?.price || 'None detected',
        distance_to_support: distToSupport ? `-${distToSupport.toFixed(2)}%` : 'N/A',
        support_touch_count: state.nodes.supportTouchCount ?? 0,
        active_nodes_count: state.nodes.all.length,
      },
      candle_patterns: state.candlePatterns?.length
        ? state.candlePatterns.map((p) => `${p.name} (${p.type})`)
        : ['No significant patterns'],
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
