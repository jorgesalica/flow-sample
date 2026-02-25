import type { Candle } from './fractals';

/**
 * Detected candle pattern with significance
 */
export interface CandlePattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  significance: 'strong' | 'moderate' | 'weak';
}

/**
 * Detect candle patterns in the last N candles.
 * Returns patterns found in the most recent 3 candles.
 *
 * @param candles - Array of candles (chronological order, oldest first)
 * @returns Array of detected patterns
 */
export function detectCandlePatterns(candles: Candle[]): CandlePattern[] {
  if (candles.length < 2) return [];

  const patterns: CandlePattern[] = [];
  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  // Calculate body and wick sizes for current candle
  const body = Math.abs(current.close - current.open);
  const upperWick = current.high - Math.max(current.open, current.close);
  const lowerWick = Math.min(current.open, current.close) - current.low;
  const totalRange = current.high - current.low;
  const isBullish = current.close > current.open;

  // Avoid division by zero
  if (totalRange === 0) return [];

  // 1. DOJI: Very small body relative to range (< 10%)
  if (body / totalRange < 0.1) {
    patterns.push({
      name: 'Doji',
      type: 'neutral',
      significance: 'moderate',
    });
  }

  // 2. HAMMER: Small body at top, long lower wick (2x+ body), minimal upper wick
  // Bullish reversal signal when found at support
  if (lowerWick >= body * 2 && upperWick < body * 0.5 && body / totalRange < 0.4) {
    patterns.push({
      name: isBullish ? 'Hammer' : 'Hanging Man',
      type: isBullish ? 'bullish' : 'bearish',
      significance: 'strong',
    });
  }

  // 3. INVERTED HAMMER: Small body at bottom, long upper wick
  if (upperWick >= body * 2 && lowerWick < body * 0.5 && body / totalRange < 0.4) {
    patterns.push({
      name: isBullish ? 'Inverted Hammer' : 'Shooting Star',
      type: isBullish ? 'bullish' : 'bearish',
      significance: 'strong',
    });
  }

  // 4. ENGULFING: Current candle completely engulfs previous candle's body
  const prevBody = Math.abs(previous.close - previous.open);
  const prevBullish = previous.close > previous.open;

  if (prevBody > 0) {
    // Bullish Engulfing: Current bullish candle engulfs previous bearish
    if (
      isBullish &&
      !prevBullish &&
      current.open < previous.close &&
      current.close > previous.open
    ) {
      patterns.push({
        name: 'Bullish Engulfing',
        type: 'bullish',
        significance: 'strong',
      });
    }

    // Bearish Engulfing: Current bearish candle engulfs previous bullish
    if (
      !isBullish &&
      prevBullish &&
      current.open > previous.close &&
      current.close < previous.open
    ) {
      patterns.push({
        name: 'Bearish Engulfing',
        type: 'bearish',
        significance: 'strong',
      });
    }
  }

  // 5. MARUBOZU: Full body candle with minimal wicks (strong momentum)
  if (body / totalRange > 0.9 && upperWick / totalRange < 0.05 && lowerWick / totalRange < 0.05) {
    patterns.push({
      name: isBullish ? 'Bullish Marubozu' : 'Bearish Marubozu',
      type: isBullish ? 'bullish' : 'bearish',
      significance: 'strong',
    });
  }

  return patterns;
}

/**
 * Get a simple string summary of detected patterns for LLM consumption.
 */
export function summarizeCandlePatterns(patterns: CandlePattern[]): string {
  if (patterns.length === 0) return 'No significant patterns';

  return patterns.map((p) => `${p.name} (${p.significance} ${p.type})`).join(', ');
}
