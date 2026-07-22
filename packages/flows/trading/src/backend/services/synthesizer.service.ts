import { type MarketState } from '../../domain/types';
import type { TradingWizardAnalysis } from '@flows/shared';
import type { LLMMessage } from '@flows/core';
import { MENTOR_SYSTEM_PROMPT } from '../config';

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
  public enrichMarketState(state: MarketState): TradingWizardAnalysis {
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
        macd: state.indicators.macd
          ? {
              value: state.indicators.macd.value.toFixed(4),
              signal: state.indicators.macd.signal.toFixed(4),
              histogram: state.indicators.macd.histogram.toFixed(4),
              bias: state.indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish',
            }
          : 'N/A',
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
