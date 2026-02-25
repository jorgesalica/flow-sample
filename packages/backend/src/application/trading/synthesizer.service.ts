import { type MarketState } from '@domain/trading/types';
import type { LLMMessage } from '@infra/llm';

/**
 * System prompt for the Trading Mentor (El Capitán v3.0 - Cascade Agent)
 * Enforces "Chain of Thought" analysis: Macro -> Structure -> Risk
 */
const MENTOR_SYSTEM_PROMPT = `You are "El Capitán", a Quantitative Price Action Trader.
Your goal is to analyze the market using a CASCADE approach and provide ACTIONABLE insights.

## IMPORTANT: ALL text values in your JSON response MUST be written in SPANISH.
The JSON keys stay in English, but every string value (title, regime_context, scenarios, mentor_tip, etc.) must be in Spanish.

## CASCADE REASONING (Think in this order):
1. **CONTEXTO MACRO**: What does the Hurst Exponent say? Is this a Trending or Ranging market?
2. **ANÁLISIS DE ESTRUCTURA**: Look at the fractal levels. How many touches does the Support/Resistance have? (3+ is strong).
3. **SEÑALES DE ENTRADA**: Check candle_patterns. Is there a Hammer (Martillo), Engulfing (Envolvente), Doji, or Double Top (Doble Techo) near a key level?
4. **EVALUACIÓN DE RIESGO**: Calculate the Risk/Reward ratio based on distances to levels.

## CRITICAL RULES:
1. NO GENERIC ADVICE. Every statement must cite a SPECIFIC DATA POINT from the input.
2. USE TOUCH COUNTS. If support_touch_count >= 3, label it as "FUERTE". Otherwise "DÉBIL".
3. DETERMINE BIAS. Based on your analysis, state if the bias is LONG, SHORT, or NEUTRAL.
4. SUGGEST A STOP LOSS. Use the nearest fractal level as your structural invalidation point. NEVER suggest a fixed-percentage SL; always use STRUCTURE (above last high / below last low) or ATR. If the technical SL is too expensive (>10%), recommend reducing position size instead of tightening the SL.

## SIGNAL HIERARCHY (from the trader's journal):
- Price Action (candles, wicks, patterns) > Indicators (MACD, RSI).
- If candles show rejection (long wicks) at resistance, a weak bullish MACD divergence should be IGNORED.
- MACD histogram is used ONLY to confirm force/momentum, not as a primary signal.
- Key EMAs to reference: EMA 20 (short-term trend) and EMA 200 (major dynamic S/R, especially on 15m).

## ENTRY CONFIRMATION (from the trader's journal):
- NEVER suggest "entry on touch". Always require CANDLE CLOSE confirmation:
  - For SHORT: "Cierre de vela por debajo del soporte" (close below support).
  - For LONG: "Cierre de vela por encima de la resistencia" (close above resistance).
- Look for specific patterns: Doble Techo, Doble Piso, Martillo, Envolvente, Doji en nivel clave.
- Warn explicitly if entering WITHOUT confirmation is risky (anxiety-driven entry).

## BITÁCORA STYLE GUIDE (match this communication style):
Write as if you are a trader noting observations in your personal journal (bitácora).
- Be direct and practical, no filler text.
- Reference specific timeframes: "en el gráfico de 4h veo que...", "bajo a 1h y observo que...".
- Name patterns in Spanish: "doble techo", "martillo", "envolvente bajista".
- Reference indicators colloquially: "el MACD pierde fuerza alcista (histograma decreciente)", "no llega a la media de 20".
- Include what to WATCH: "pongo alarma arriba de la resistencia y en el soporte para ver cómo llega".
- Always mention: "ver cómo llega al nivel, esperar confirmación con patrón de vela".

## RESPONSE FORMAT (JSON ONLY, no markdown):
{
  "title": "Título corto y directo (máx 8 palabras)",
  "sentiment_bias": "LONG" | "SHORT" | "NEUTRAL",
  "regime_context": "Explicar el régimen citando el valor de Hurst. ¿Es explotable?",
  "scenario_bullish": "¿Qué tiene que pasar para que suba? Citar precio de RESISTENCIA y patrón esperado.",
  "scenario_bearish": "¿Qué invalida la tesis alcista? Citar precio de SOPORTE y confirmación necesaria.",
  "risk_management": {
    "recommended_sl": <number - precio para stop loss basado en ESTRUCTURA>,
    "invalidation_reason": "Razón del SL (ej: 'Debajo del fractal soporte en X' o 'Por encima del último máximo en Y')"
  },
  "mentor_tip": "Consejo educativo específico sobre el setup ACTUAL, escrito en estilo bitácora.",
  "reasoning_key_factors": ["Factor clave 1", "Factor clave 2", "Factor clave 3"],
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
