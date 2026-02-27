import { describe, it, expect } from 'vitest';
import {
    detectFractals,
    getRecentFractals,
    findNearestResistance,
    findNearestSupport,
    calculateTouchCounts,
    type Candle,
    type FractalNode,
} from '../../src/domain/math/fractals';

// Helper: create a candle
function candle(openTime: number, open: number, high: number, low: number, close: number): Candle {
    return { openTime, open, high, low, close, volume: 100 };
}

// Classic 5-bar fractal high: lower highs on both sides of center
const fractalHighCandles: Candle[] = [
    candle(1, 100, 105, 99, 101),   // left-2: high=105
    candle(2, 101, 108, 100, 102),  // left-1: high=108
    candle(3, 102, 115, 101, 103),  // center: high=115 (HIGHEST)
    candle(4, 103, 110, 100, 101),  // right-1: high=110
    candle(5, 101, 106, 99, 100),   // right-2: high=106
];

// Classic 5-bar fractal low: higher lows on both sides of center
// Highs are flat to avoid accidentally forming a fractal high
const fractalLowCandles: Candle[] = [
    candle(1, 100, 105, 95, 101),   // left-2: low=95
    candle(2, 101, 105, 92, 102),   // left-1: low=92
    candle(3, 102, 105, 85, 103),   // center: low=85 (LOWEST)
    candle(4, 103, 105, 90, 101),   // right-1: low=90
    candle(5, 101, 105, 93, 100),   // right-2: low=93
];

// Both fractal high AND low at center
const dualFractalCandles: Candle[] = [
    candle(1, 100, 105, 95, 101),
    candle(2, 101, 108, 92, 102),
    candle(3, 102, 115, 80, 103),   // highest high AND lowest low
    candle(4, 103, 110, 90, 101),
    candle(5, 101, 106, 93, 100),
];

describe('detectFractals', () => {
    it('returns empty for insufficient data', () => {
        expect(detectFractals([])).toEqual([]);
        expect(detectFractals([candle(1, 100, 105, 95, 101)])).toEqual([]);
        expect(detectFractals(fractalHighCandles.slice(0, 4))).toEqual([]);
    });

    it('detects fractal high', () => {
        const fractals = detectFractals(fractalHighCandles);
        expect(fractals).toHaveLength(1);
        expect(fractals[0].type).toBe('high');
        expect(fractals[0].price).toBe(115);
        expect(fractals[0].index).toBe(2);
    });

    it('detects fractal low', () => {
        const fractals = detectFractals(fractalLowCandles);
        expect(fractals).toHaveLength(1);
        expect(fractals[0].type).toBe('low');
        expect(fractals[0].price).toBe(85);
        expect(fractals[0].index).toBe(2);
    });

    it('detects both high and low on same candle', () => {
        const fractals = detectFractals(dualFractalCandles);
        expect(fractals).toHaveLength(2);
        const types = fractals.map((f) => f.type).sort();
        expect(types).toEqual(['high', 'low']);
    });

    it('does not detect fractal when left side is equal', () => {
        const candles: Candle[] = [
            candle(1, 100, 115, 99, 101),  // same high as center
            candle(2, 101, 108, 100, 102),
            candle(3, 102, 115, 101, 103), // center: tied with left-2
            candle(4, 103, 110, 100, 101),
            candle(5, 101, 106, 99, 100),
        ];
        const fractals = detectFractals(candles);
        const highs = fractals.filter((f) => f.type === 'high');
        expect(highs).toHaveLength(0);
    });

    it('detects multiple fractals in longer series', () => {
        const candles: Candle[] = [
            candle(1, 100, 105, 95, 101),
            candle(2, 101, 108, 92, 102),
            candle(3, 102, 115, 85, 103),  // fractal high + low
            candle(4, 103, 110, 90, 101),
            candle(5, 101, 106, 93, 100),
            candle(6, 100, 108, 91, 102),
            candle(7, 102, 120, 82, 103),  // another fractal high + low
            candle(8, 103, 112, 88, 101),
            candle(9, 101, 107, 92, 100),
        ];
        const fractals = detectFractals(candles);
        expect(fractals.length).toBeGreaterThanOrEqual(4);
    });

    it('supports custom lookback', () => {
        // With lookback=1, only need 3 bars
        const candles: Candle[] = [
            candle(1, 100, 105, 95, 101),
            candle(2, 102, 115, 85, 103),
            candle(3, 101, 106, 93, 100),
        ];
        const fractals = detectFractals(candles, 1);
        expect(fractals.length).toBeGreaterThan(0);
    });
});

describe('getRecentFractals', () => {
    it('returns last N fractals', () => {
        const fractals: FractalNode[] = Array.from({ length: 20 }, (_, i) => ({
            type: 'high' as const,
            price: 100 + i,
            candleOpenTime: i,
            index: i,
        }));

        const recent = getRecentFractals(fractals, 5);
        expect(recent).toHaveLength(5);
        expect(recent[0].price).toBe(115);
        expect(recent[4].price).toBe(119);
    });

    it('returns all if fewer than count', () => {
        const fractals: FractalNode[] = [
            { type: 'high', price: 100, candleOpenTime: 1, index: 1 },
        ];
        expect(getRecentFractals(fractals, 10)).toHaveLength(1);
    });
});

describe('findNearestResistance', () => {
    const fractals: FractalNode[] = [
        { type: 'high', price: 110, candleOpenTime: 1, index: 1 },
        { type: 'high', price: 120, candleOpenTime: 2, index: 2 },
        { type: 'low', price: 90, candleOpenTime: 3, index: 3 },
        { type: 'high', price: 105, candleOpenTime: 4, index: 4 },
    ];

    it('finds nearest high above price', () => {
        const result = findNearestResistance(fractals, 100);
        expect(result).not.toBeNull();
        expect(result!.price).toBe(105);
    });

    it('returns null when no highs above price', () => {
        expect(findNearestResistance(fractals, 200)).toBeNull();
    });

    it('ignores fractal lows', () => {
        const result = findNearestResistance(fractals, 85);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('high');
    });
});

describe('findNearestSupport', () => {
    const fractals: FractalNode[] = [
        { type: 'low', price: 90, candleOpenTime: 1, index: 1 },
        { type: 'low', price: 80, candleOpenTime: 2, index: 2 },
        { type: 'high', price: 110, candleOpenTime: 3, index: 3 },
        { type: 'low', price: 95, candleOpenTime: 4, index: 4 },
    ];

    it('finds nearest low below price', () => {
        const result = findNearestSupport(fractals, 100);
        expect(result).not.toBeNull();
        expect(result!.price).toBe(95);
    });

    it('returns null when no lows below price', () => {
        expect(findNearestSupport(fractals, 50)).toBeNull();
    });
});

describe('calculateTouchCounts', () => {
    it('counts touches within tolerance', () => {
        const fractals: FractalNode[] = [
            { type: 'high', price: 100, candleOpenTime: 1, index: 0 },
        ];
        const candles: Candle[] = [
            candle(1, 95, 100, 90, 95),   // fractal candle (index 0)
            candle(2, 95, 98, 90, 95),    // index 1 (skipped, < index+3)
            candle(3, 95, 97, 90, 95),    // index 2 (skipped)
            candle(4, 95, 99, 90, 95),    // index 3: high=99, within 0.5% of 100
            candle(5, 95, 100.3, 90, 95), // index 4: high=100.3, within 0.5% of 100
            candle(6, 95, 95, 90, 95),    // index 5: high=95, NOT within tolerance
        ];

        // 0.5% of 100 = tolerance zone ±0.5
        // high=99 → diff=1.0 → outside tolerance
        // high=100.3 → diff=0.3 → within tolerance
        const result = calculateTouchCounts(fractals, candles, 0.5);
        expect(result).toHaveLength(1);
        expect(result[0].touchCount).toBe(1);
    });

    it('returns 0 touches when no candles are close', () => {
        const fractals: FractalNode[] = [
            { type: 'high', price: 200, candleOpenTime: 1, index: 0 },
        ];
        const candles: Candle[] = Array.from({ length: 10 }, (_, i) =>
            candle(i, 95, 100, 90, 95)
        );

        const result = calculateTouchCounts(fractals, candles, 0.5);
        expect(result[0].touchCount).toBe(0);
    });
});
