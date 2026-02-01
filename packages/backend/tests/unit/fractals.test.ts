import { describe, it, expect } from 'vitest';
import {
    detectFractals,
    getRecentFractals,
    findNearestResistance,
    findNearestSupport,
    type Candle,
} from '@domain/trading/math/fractals';

// Helper to create test candles
function createCandle(
    index: number,
    high: number,
    low: number,
    close?: number,
): Candle {
    return {
        openTime: 1000000 + index * 60000,
        open: low + (high - low) * 0.5,
        high,
        low,
        close: close ?? low + (high - low) * 0.5,
        volume: 100,
    };
}

describe('Fractal Detection', () => {
    describe('detectFractals', () => {
        it('returns empty array when less than 5 candles', () => {
            const candles = [
                createCandle(0, 100, 90),
                createCandle(1, 101, 91),
                createCandle(2, 102, 92),
                createCandle(3, 101, 91),
            ];
            expect(detectFractals(candles)).toEqual([]);
        });

        it('detects fractal high when center bar has highest high', () => {
            // Pattern: low, high, HIGHEST, high, low
            const candles: Candle[] = [
                createCandle(0, 100, 90),
                createCandle(1, 105, 95),
                createCandle(2, 110, 100), // Fractal high
                createCandle(3, 105, 95),
                createCandle(4, 100, 90),
            ];

            const fractals = detectFractals(candles);
            expect(fractals.length).toBe(1);
            expect(fractals[0].type).toBe('high');
            expect(fractals[0].price).toBe(110);
            expect(fractals[0].index).toBe(2);
        });

        it('detects fractal low when center bar has lowest low', () => {
            // Pattern: high, low, LOWEST, low, high
            const candles: Candle[] = [
                createCandle(0, 110, 100),
                createCandle(1, 105, 95),
                createCandle(2, 100, 90), // Fractal low
                createCandle(3, 105, 95),
                createCandle(4, 110, 100),
            ];

            const fractals = detectFractals(candles);
            expect(fractals.length).toBe(1);
            expect(fractals[0].type).toBe('low');
            expect(fractals[0].price).toBe(90);
            expect(fractals[0].index).toBe(2);
        });

        it('detects both high and low fractals on same candle', () => {
            // V-bottom followed by inverted-V
            const candles: Candle[] = [
                createCandle(0, 110, 100),
                createCandle(1, 105, 95),
                createCandle(2, 115, 88), // Both highest high AND lowest low
                createCandle(3, 105, 95),
                createCandle(4, 110, 100),
            ];

            const fractals = detectFractals(candles);
            expect(fractals.length).toBe(2);
            expect(fractals.some((f) => f.type === 'high')).toBe(true);
            expect(fractals.some((f) => f.type === 'low')).toBe(true);
        });

        it('does not detect fractal when equal highs exist', () => {
            // If left bar has same high, not a fractal
            const candles: Candle[] = [
                createCandle(0, 100, 90),
                createCandle(1, 110, 95), // Same high as center
                createCandle(2, 110, 100),
                createCandle(3, 105, 95),
                createCandle(4, 100, 90),
            ];

            const fractals = detectFractals(candles);
            const highs = fractals.filter((f) => f.type === 'high');
            expect(highs.length).toBe(0);
        });

        it('detects multiple fractals in longer series', () => {
            const candles: Candle[] = [
                createCandle(0, 100, 90),
                createCandle(1, 105, 95),
                createCandle(2, 110, 100), // High
                createCandle(3, 105, 95),
                createCandle(4, 100, 90),
                createCandle(5, 95, 85),
                createCandle(6, 90, 80), // Low
                createCandle(7, 95, 85),
                createCandle(8, 100, 90),
            ];

            const fractals = detectFractals(candles);
            expect(fractals.length).toBe(2);
        });

        it('respects custom lookback parameter', () => {
            // With lookback=1, only need 3 candles
            const candles: Candle[] = [
                createCandle(0, 100, 90),
                createCandle(1, 110, 80), // High and low with lookback=1
                createCandle(2, 100, 90),
            ];

            const fractals = detectFractals(candles, 1);
            expect(fractals.length).toBe(2);
        });
    });

    describe('getRecentFractals', () => {
        it('returns last N fractals', () => {
            const fractals = [
                { type: 'high' as const, price: 100, candleOpenTime: 1000, index: 0 },
                { type: 'low' as const, price: 90, candleOpenTime: 2000, index: 1 },
                { type: 'high' as const, price: 105, candleOpenTime: 3000, index: 2 },
                { type: 'low' as const, price: 85, candleOpenTime: 4000, index: 3 },
            ];

            const recent = getRecentFractals(fractals, 2);
            expect(recent.length).toBe(2);
            expect(recent[0].price).toBe(105);
            expect(recent[1].price).toBe(85);
        });

        it('returns all fractals if count exceeds array length', () => {
            const fractals = [
                { type: 'high' as const, price: 100, candleOpenTime: 1000, index: 0 },
            ];
            const recent = getRecentFractals(fractals, 10);
            expect(recent.length).toBe(1);
        });
    });

    describe('findNearestResistance', () => {
        const fractals = [
            { type: 'high' as const, price: 95, candleOpenTime: 1000, index: 0 },
            { type: 'high' as const, price: 105, candleOpenTime: 2000, index: 1 },
            { type: 'high' as const, price: 110, candleOpenTime: 3000, index: 2 },
            { type: 'low' as const, price: 90, candleOpenTime: 4000, index: 3 },
        ];

        it('returns nearest high above current price', () => {
            const resistance = findNearestResistance(fractals, 100);
            expect(resistance).not.toBeNull();
            expect(resistance?.price).toBe(105);
        });

        it('returns null if no resistance above price', () => {
            const resistance = findNearestResistance(fractals, 115);
            expect(resistance).toBeNull();
        });

        it('ignores fractal lows', () => {
            const resistance = findNearestResistance(fractals, 85);
            expect(resistance?.type).toBe('high');
        });
    });

    describe('findNearestSupport', () => {
        const fractals = [
            { type: 'low' as const, price: 95, candleOpenTime: 1000, index: 0 },
            { type: 'low' as const, price: 90, candleOpenTime: 2000, index: 1 },
            { type: 'low' as const, price: 85, candleOpenTime: 3000, index: 2 },
            { type: 'high' as const, price: 110, candleOpenTime: 4000, index: 3 },
        ];

        it('returns nearest low below current price', () => {
            const support = findNearestSupport(fractals, 92);
            expect(support).not.toBeNull();
            expect(support?.price).toBe(90);
        });

        it('returns null if no support below price', () => {
            const support = findNearestSupport(fractals, 80);
            expect(support).toBeNull();
        });

        it('ignores fractal highs', () => {
            const support = findNearestSupport(fractals, 115);
            expect(support?.type).toBe('low');
        });
    });
});
