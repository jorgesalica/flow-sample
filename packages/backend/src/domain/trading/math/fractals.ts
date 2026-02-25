/**
 * Bill Williams Fractal Detection
 *
 * A fractal is a 5-bar pattern where:
 * - Fractal High: Middle bar has highest high, with 2 lower highs on each side
 * - Fractal Low: Middle bar has lowest low, with 2 higher lows on each side
 *
 * Fractals mark potential support/resistance levels and trend reversal points.
 */

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FractalNode {
  type: 'high' | 'low';
  price: number;
  candleOpenTime: number;
  index: number;
}

/**
 * Detect Bill Williams fractals in a series of candles.
 *
 * @param candles - Array of candles (minimum 5 required)
 * @param lookback - Number of bars on each side to compare (default: 2)
 * @returns Array of detected fractal nodes
 */
export function detectFractals(candles: Candle[], lookback: number = 2): FractalNode[] {
  const fractals: FractalNode[] = [];
  const minBars = lookback * 2 + 1;

  if (candles.length < minBars) {
    return fractals;
  }

  // Iterate through candles, checking each as potential fractal center
  for (let i = lookback; i < candles.length - lookback; i++) {
    const centerCandle = candles[i];

    // Check for fractal high
    if (isFractalHigh(candles, i, lookback)) {
      fractals.push({
        type: 'high',
        price: centerCandle.high,
        candleOpenTime: centerCandle.openTime,
        index: i,
      });
    }

    // Check for fractal low
    if (isFractalLow(candles, i, lookback)) {
      fractals.push({
        type: 'low',
        price: centerCandle.low,
        candleOpenTime: centerCandle.openTime,
        index: i,
      });
    }
  }

  return fractals;
}

/**
 * Check if the candle at index is a fractal high.
 */
function isFractalHigh(candles: Candle[], index: number, lookback: number): boolean {
  const centerHigh = candles[index].high;

  // Check left side
  for (let i = 1; i <= lookback; i++) {
    if (candles[index - i].high >= centerHigh) {
      return false;
    }
  }

  // Check right side
  for (let i = 1; i <= lookback; i++) {
    if (candles[index + i].high >= centerHigh) {
      return false;
    }
  }

  return true;
}

/**
 * Check if the candle at index is a fractal low.
 */
function isFractalLow(candles: Candle[], index: number, lookback: number): boolean {
  const centerLow = candles[index].low;

  // Check left side
  for (let i = 1; i <= lookback; i++) {
    if (candles[index - i].low <= centerLow) {
      return false;
    }
  }

  // Check right side
  for (let i = 1; i <= lookback; i++) {
    if (candles[index + i].low <= centerLow) {
      return false;
    }
  }

  return true;
}

/**
 * Get only the most recent N fractals.
 */
export function getRecentFractals(fractals: FractalNode[], count: number = 10): FractalNode[] {
  return fractals.slice(-count);
}

/**
 * Find nearest fractal high above current price (resistance).
 */
export function findNearestResistance(
  fractals: FractalNode[],
  currentPrice: number,
): FractalNode | null {
  const highs = fractals
    .filter((f) => f.type === 'high' && f.price > currentPrice)
    .sort((a, b) => a.price - b.price);

  return highs.length > 0 ? highs[0] : null;
}

/**
 * Find nearest fractal low below current price (support).
 */
export function findNearestSupport(
  fractals: FractalNode[],
  currentPrice: number,
): FractalNode | null {
  const lows = fractals
    .filter((f) => f.type === 'low' && f.price < currentPrice)
    .sort((a, b) => b.price - a.price);

  return lows.length > 0 ? lows[0] : null;
}

/**
 * Fractal with touch count for strength validation.
 */
export interface FractalWithTouches extends FractalNode {
  touchCount: number;
}

/**
 * Calculate "touch counts" for fractal levels.
 * A "touch" is when price came within a tolerance zone of the fractal price.
 *
 * @param fractals - Array of detected fractals
 * @param candles - Full candle history to search for touches
 * @param tolerancePercent - How close price must be to count as a touch (default 0.5%)
 * @returns Fractals enriched with touch counts
 */
export function calculateTouchCounts(
  fractals: FractalNode[],
  candles: Candle[],
  tolerancePercent: number = 0.5,
): FractalWithTouches[] {
  return fractals.map((fractal) => {
    let touchCount = 0;
    const tolerance = fractal.price * (tolerancePercent / 100);

    // Count how many candles "touched" this level after it was formed
    for (let i = fractal.index + 3; i < candles.length; i++) {
      const candle = candles[i];

      // For highs (resistance), check if high came close to the level
      if (fractal.type === 'high') {
        if (Math.abs(candle.high - fractal.price) <= tolerance) {
          touchCount++;
        }
      }

      // For lows (support), check if low came close to the level
      if (fractal.type === 'low') {
        if (Math.abs(candle.low - fractal.price) <= tolerance) {
          touchCount++;
        }
      }
    }

    return {
      ...fractal,
      touchCount,
    };
  });
}

export default detectFractals;
