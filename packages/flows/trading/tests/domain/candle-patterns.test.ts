import { describe, it, expect } from 'vitest';
import {
  detectCandlePatterns,
  summarizeCandlePatterns,
  type CandlePattern,
} from '../../src/domain/math/candle-patterns';
import type { Candle } from '../../src/domain/math/fractals';

// Helper: create a candle
function candle(open: number, high: number, low: number, close: number): Candle {
  return { openTime: Date.now(), open, high, low, close, volume: 100 };
}

describe('detectCandlePatterns', () => {
  it('returns empty for insufficient data', () => {
    expect(detectCandlePatterns([])).toEqual([]);
    expect(detectCandlePatterns([candle(100, 110, 90, 105)])).toEqual([]);
  });

  it('returns empty for zero-range candle', () => {
    const candles = [candle(100, 100, 100, 100), candle(100, 100, 100, 100)];
    expect(detectCandlePatterns(candles)).toEqual([]);
  });

  describe('Doji', () => {
    it('detects doji (tiny body, long wicks)', () => {
      const candles = [
        candle(100, 105, 95, 101), // previous
        candle(100, 110, 90, 100.5), // doji: body=0.5, range=20 → 2.5%
      ];
      const patterns = detectCandlePatterns(candles);
      const doji = patterns.find((p) => p.name === 'Doji');
      expect(doji).toBeDefined();
      expect(doji!.type).toBe('neutral');
    });
  });

  describe('Hammer / Hanging Man', () => {
    it('detects bullish hammer (small body at top, long lower wick)', () => {
      const candles = [
        candle(100, 105, 95, 101),
        candle(98, 102, 88, 101), // body=3, lowerWick=10 (3.3x body), upperWick=1
      ];
      const patterns = detectCandlePatterns(candles);
      const hammer = patterns.find((p) => p.name === 'Hammer');
      expect(hammer).toBeDefined();
      expect(hammer!.type).toBe('bullish');
      expect(hammer!.significance).toBe('strong');
    });

    it('detects bearish hanging man', () => {
      const candles = [
        candle(100, 105, 95, 101),
        candle(101, 102, 88, 98), // bearish, long lower wick
      ];
      const patterns = detectCandlePatterns(candles);
      const hangingMan = patterns.find((p) => p.name === 'Hanging Man');
      expect(hangingMan).toBeDefined();
      expect(hangingMan!.type).toBe('bearish');
    });
  });

  describe('Shooting Star / Inverted Hammer', () => {
    it('detects shooting star (bearish, long upper wick)', () => {
      const candles = [
        candle(100, 105, 95, 101),
        candle(101, 115, 100, 98), // bearish close, upperWick=14, body=3, lowerWick=0 (adjusted: close < open)
      ];
      const patterns = detectCandlePatterns(candles);
      const star = patterns.find((p) => p.name === 'Shooting Star');
      expect(star).toBeDefined();
      expect(star!.type).toBe('bearish');
    });

    it('detects inverted hammer (bullish, long upper wick)', () => {
      const candles = [
        candle(100, 105, 95, 101),
        candle(98, 115, 97, 101), // bullish close, upperWick=14, body=3, lowerWick=1
      ];
      const patterns = detectCandlePatterns(candles);
      const invHammer = patterns.find((p) => p.name === 'Inverted Hammer');
      expect(invHammer).toBeDefined();
      expect(invHammer!.type).toBe('bullish');
    });
  });

  describe('Engulfing', () => {
    it('detects bullish engulfing', () => {
      const candles = [
        candle(105, 106, 100, 101), // previous: bearish (open > close)
        candle(100, 107, 99, 106), // current: bullish, opens below prev close, closes above prev open
      ];
      const patterns = detectCandlePatterns(candles);
      const engulfing = patterns.find((p) => p.name === 'Bullish Engulfing');
      expect(engulfing).toBeDefined();
      expect(engulfing!.type).toBe('bullish');
      expect(engulfing!.significance).toBe('strong');
    });

    it('detects bearish engulfing', () => {
      const candles = [
        candle(100, 106, 99, 105), // previous: bullish
        candle(106, 107, 98, 99), // current: bearish, opens above prev close, closes below prev open
      ];
      const patterns = detectCandlePatterns(candles);
      const engulfing = patterns.find((p) => p.name === 'Bearish Engulfing');
      expect(engulfing).toBeDefined();
      expect(engulfing!.type).toBe('bearish');
    });
  });

  describe('Marubozu', () => {
    it('detects bullish marubozu (full body, no wicks)', () => {
      const candles = [
        candle(100, 105, 95, 101),
        candle(100, 110.4, 100, 110), // body=10, range=10.4, body/range=96%
      ];
      const patterns = detectCandlePatterns(candles);
      const marubozu = patterns.find((p) => p.name === 'Bullish Marubozu');
      expect(marubozu).toBeDefined();
      expect(marubozu!.significance).toBe('strong');
    });

    it('detects bearish marubozu', () => {
      const candles = [
        candle(100, 105, 95, 101),
        candle(110, 110.4, 100, 100), // bearish, body=10, tiny wicks
      ];
      const patterns = detectCandlePatterns(candles);
      const marubozu = patterns.find((p) => p.name === 'Bearish Marubozu');
      expect(marubozu).toBeDefined();
    });
  });
});

describe('summarizeCandlePatterns', () => {
  it('returns "No significant patterns" for empty array', () => {
    expect(summarizeCandlePatterns([])).toBe('No significant patterns');
  });

  it('formats pattern names with type and significance', () => {
    const patterns: CandlePattern[] = [
      { name: 'Doji', type: 'neutral', significance: 'moderate' },
      { name: 'Hammer', type: 'bullish', significance: 'strong' },
    ];
    const summary = summarizeCandlePatterns(patterns);
    expect(summary).toBe('Doji (moderate neutral), Hammer (strong bullish)');
  });
});
