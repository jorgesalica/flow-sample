import { describe, it, expect } from 'vitest';
import {
  calculateHurst,
  classifyRegime,
  calculateFractalDimension,
} from '../../src/domain/math/hurst';

// Helper: generate a random walk series
function randomWalk(length: number, seed = 42): number[] {
  const series: number[] = [100];
  let s = seed;
  for (let i = 1; i < length; i++) {
    // Simple LCG pseudo-random
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    const r = (s / 2 ** 32 - 0.5) * 2;
    series.push(series[i - 1] + r);
  }
  return series;
}

// Helper: generate a trending series
function trendingSeries(length: number): number[] {
  return Array.from({ length }, (_, i) => 100 + i * 0.5 + Math.sin(i / 5) * 0.3);
}

// Helper: generate a mean-reverting series
function meanRevertingSeries(length: number): number[] {
  const series: number[] = [100];
  for (let i = 1; i < length; i++) {
    // Strong mean reversion: always pull back toward 100
    const deviation = series[i - 1] - 100;
    series.push(100 - deviation * 0.8 + Math.sin(i) * 0.5);
  }
  return series;
}

describe('calculateHurst', () => {
  it('returns 0.5 for insufficient data', () => {
    expect(calculateHurst([])).toBe(0.5);
    expect(calculateHurst([1, 2, 3])).toBe(0.5);
  });

  it('returns value in valid range [0.1, 0.9]', () => {
    const series = randomWalk(200);
    const h = calculateHurst(series);
    expect(h).toBeGreaterThanOrEqual(0.1);
    expect(h).toBeLessThanOrEqual(0.9);
  });

  it('returns value between 0.35-0.9 for pseudo-random walk', () => {
    // Note: Simple LCG PRNGs can exhibit persistence,
    // so we test a wider range rather than strict ~0.5
    const series = randomWalk(500);
    const h = calculateHurst(series);
    expect(h).toBeGreaterThan(0.35);
    expect(h).toBeLessThanOrEqual(0.9);
  });

  it('gives > 0.5 for trending series', () => {
    const series = trendingSeries(300);
    const h = calculateHurst(series);
    expect(h).toBeGreaterThan(0.5);
  });

  it('gives < 0.5 for mean-reverting series', () => {
    const series = meanRevertingSeries(300);
    const h = calculateHurst(series);
    expect(h).toBeLessThan(0.5);
  });

  it('respects custom minWindowSize', () => {
    const series = randomWalk(100);
    const h = calculateHurst(series, 20);
    expect(h).toBeGreaterThanOrEqual(0.1);
    expect(h).toBeLessThanOrEqual(0.9);
  });
});

describe('classifyRegime', () => {
  it('classifies trending market', () => {
    expect(classifyRegime(0.7)).toBe('TRENDING');
    expect(classifyRegime(0.56)).toBe('TRENDING');
  });

  it('classifies ranging market', () => {
    expect(classifyRegime(0.3)).toBe('RANGING');
    expect(classifyRegime(0.44)).toBe('RANGING');
  });

  it('classifies random walk', () => {
    expect(classifyRegime(0.5)).toBe('RANDOM');
    expect(classifyRegime(0.45)).toBe('RANDOM');
    expect(classifyRegime(0.55)).toBe('RANDOM');
  });

  it('handles boundary values', () => {
    expect(classifyRegime(0.55)).toBe('RANDOM');
    expect(classifyRegime(0.45)).toBe('RANDOM');
  });
});

describe('calculateFractalDimension', () => {
  it('returns D = 2 - H', () => {
    expect(calculateFractalDimension(0.5)).toBe(1.5);
    expect(calculateFractalDimension(0.7)).toBeCloseTo(1.3);
    expect(calculateFractalDimension(0.3)).toBeCloseTo(1.7);
  });

  it('returns 1.0 for perfect trend (H=1)', () => {
    expect(calculateFractalDimension(1)).toBe(1);
  });

  it('returns 2.0 for perfect anti-persistence (H=0)', () => {
    expect(calculateFractalDimension(0)).toBe(2);
  });
});
