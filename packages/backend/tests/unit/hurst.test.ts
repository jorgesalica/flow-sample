import { describe, it, expect } from 'vitest';
import {
    calculateHurst,
    classifyRegime,
    calculateFractalDimension,
} from '@domain/trading/math/hurst';

describe('Hurst Exponent Calculator', () => {
    describe('calculateHurst', () => {
        it('returns 0.5 when series is too short', () => {
            const shortSeries = [1, 2, 3, 4, 5];
            expect(calculateHurst(shortSeries)).toBe(0.5);
        });

        it('returns value between 0.1 and 0.9', () => {
            // Generate random walk data
            const series: number[] = [];
            let value = 100;
            for (let i = 0; i < 200; i++) {
                value += (Math.random() - 0.5) * 2;
                series.push(value);
            }
            const hurst = calculateHurst(series);
            expect(hurst).toBeGreaterThanOrEqual(0.1);
            expect(hurst).toBeLessThanOrEqual(0.9);
        });

        it('detects trending behavior in upward series', () => {
            // Strong uptrend with noise
            const trendingSeries: number[] = [];
            let value = 100;
            for (let i = 0; i < 200; i++) {
                value += 1 + (Math.random() - 0.5) * 0.5; // Mostly up
                trendingSeries.push(value);
            }
            const hurst = calculateHurst(trendingSeries);
            // Trending series should have H > 0.5
            expect(hurst).toBeGreaterThan(0.5);
        });

        it('returns consistent values for same input', () => {
            // Deterministic test - same input should give same output
            const series: number[] = [];
            for (let i = 0; i < 200; i++) {
                series.push(100 + Math.sin(i / 10) * 10);
            }
            const hurst1 = calculateHurst(series);
            const hurst2 = calculateHurst(series);
            expect(hurst1).toBe(hurst2);
        });

        it('handles constant series without error', () => {
            const constantSeries = Array(50).fill(100);
            const hurst = calculateHurst(constantSeries);
            // Should return a valid number, not NaN
            expect(isNaN(hurst)).toBe(false);
        });

        it('respects custom window sizes', () => {
            const series: number[] = [];
            for (let i = 0; i < 100; i++) {
                series.push(100 + Math.random() * 10);
            }
            const hurst = calculateHurst(series, 5, 40);
            expect(hurst).toBeGreaterThanOrEqual(0.1);
            expect(hurst).toBeLessThanOrEqual(0.9);
        });
    });

    describe('classifyRegime', () => {
        it('classifies H > 0.55 as TRENDING', () => {
            expect(classifyRegime(0.7)).toBe('TRENDING');
            expect(classifyRegime(0.56)).toBe('TRENDING');
            expect(classifyRegime(0.9)).toBe('TRENDING');
        });

        it('classifies H < 0.45 as RANGING', () => {
            expect(classifyRegime(0.3)).toBe('RANGING');
            expect(classifyRegime(0.44)).toBe('RANGING');
            expect(classifyRegime(0.1)).toBe('RANGING');
        });

        it('classifies H between 0.45 and 0.55 as RANDOM', () => {
            expect(classifyRegime(0.5)).toBe('RANDOM');
            expect(classifyRegime(0.45)).toBe('RANDOM');
            expect(classifyRegime(0.55)).toBe('RANDOM');
        });
    });

    describe('calculateFractalDimension', () => {
        it('returns D = 2 - H', () => {
            expect(calculateFractalDimension(0.5)).toBe(1.5);
            expect(calculateFractalDimension(0.7)).toBe(1.3);
            expect(calculateFractalDimension(0.3)).toBe(1.7);
        });

        it('returns value between 1.1 and 1.9 for valid Hurst values', () => {
            for (const h of [0.1, 0.3, 0.5, 0.7, 0.9]) {
                const d = calculateFractalDimension(h);
                expect(d).toBeGreaterThanOrEqual(1.1);
                expect(d).toBeLessThanOrEqual(1.9);
            }
        });
    });
});
