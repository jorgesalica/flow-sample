/**
 * Hurst Exponent Calculator
 *
 * The Hurst exponent (H) measures the long-term memory of a time series:
 * - H < 0.5: Mean-reverting (ranging market)
 * - H ≈ 0.5: Random walk (no predictability)
 * - H > 0.5: Trending (persistent behavior)
 *
 * Algorithm: Rescaled Range (R/S) Analysis
 */

/**
 * Calculate the Hurst exponent using R/S (Rescaled Range) analysis.
 *
 * @param series - Array of price closes or returns
 * @param minWindowSize - Minimum window size for R/S calculation (default: 10)
 * @param maxWindowSize - Maximum window size (default: series.length / 2)
 * @returns Hurst exponent (0-1, typically 0.3-0.8)
 */
export function calculateHurst(
  series: number[],
  minWindowSize: number = 10,
  maxWindowSize?: number,
): number {
  if (series.length < minWindowSize * 2) {
    // Not enough data, return random walk value
    return 0.5;
  }

  const n = series.length;
  const maxWin = maxWindowSize || Math.floor(n / 2);

  // Generate window sizes to analyze (logarithmically spaced)
  const windowSizes: number[] = [];
  for (let size = minWindowSize; size <= maxWin; size = Math.floor(size * 1.5)) {
    if (size <= n) {
      windowSizes.push(size);
    }
  }

  if (windowSizes.length < 2) {
    return 0.5;
  }

  // Calculate R/S for each window size
  const logN: number[] = [];
  const logRS: number[] = [];

  for (const windowSize of windowSizes) {
    const rsValues = calculateRSForWindow(series, windowSize);
    if (rsValues.length > 0) {
      const avgRS = rsValues.reduce((a, b) => a + b, 0) / rsValues.length;
      logN.push(Math.log(windowSize));
      logRS.push(Math.log(avgRS));
    }
  }

  if (logN.length < 2) {
    return 0.5;
  }

  // Linear regression: log(R/S) = H * log(n) + c
  const hurst = linearRegressionSlope(logN, logRS);

  // Clamp to reasonable range
  return Math.max(0.1, Math.min(0.9, hurst));
}

/**
 * Calculate R/S values for a given window size.
 */
function calculateRSForWindow(series: number[], windowSize: number): number[] {
  const rsValues: number[] = [];
  const numWindows = Math.floor(series.length / windowSize);

  for (let i = 0; i < numWindows; i++) {
    const start = i * windowSize;
    const window = series.slice(start, start + windowSize);
    const rs = calculateRS(window);
    if (isFinite(rs) && rs > 0) {
      rsValues.push(rs);
    }
  }

  return rsValues;
}

/**
 * Calculate R/S (Rescaled Range) for a single window.
 */
function calculateRS(window: number[]): number {
  const n = window.length;
  if (n < 2) return 0;

  // Calculate mean
  const mean = window.reduce((a, b) => a + b, 0) / n;

  // Calculate cumulative deviations from mean
  const deviations: number[] = [];
  let cumulative = 0;
  for (const val of window) {
    cumulative += val - mean;
    deviations.push(cumulative);
  }

  // Range (R) = max(cumulative) - min(cumulative)
  const R = Math.max(...deviations) - Math.min(...deviations);

  // Standard deviation (S)
  const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const S = Math.sqrt(variance);

  if (S === 0) return 0;

  return R / S;
}

/**
 * Simple linear regression to calculate slope.
 */
function linearRegressionSlope(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return 0.5;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0.5;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  return slope;
}

/**
 * Determine market regime based on Hurst exponent.
 */
export type MarketRegime = 'TRENDING' | 'RANGING' | 'RANDOM';

export function classifyRegime(hurst: number): MarketRegime {
  if (hurst > 0.55) return 'TRENDING';
  if (hurst < 0.45) return 'RANGING';
  return 'RANDOM';
}

/**
 * Calculate fractal dimension from Hurst exponent.
 * D = 2 - H (for time series)
 */
export function calculateFractalDimension(hurst: number): number {
  return 2 - hurst;
}

export default calculateHurst;
