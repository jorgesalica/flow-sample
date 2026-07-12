import { describe, expect, it } from 'vitest';
import type { Candle } from '@flows/shared';
import { calculateWizardMetrics, formatCompactVolume, TRADING_WIZARD_STEPS } from './wizard';

const candle = (overrides: Partial<Candle> = {}): Candle => ({
  symbol: 'BTCUSDT',
  interval: '1d',
  openTime: 1_700_000_000_000,
  closeTime: 1_700_086_400_000,
  open: 100,
  high: 120,
  low: 80,
  close: 110,
  volume: 1500,
  isClosed: true,
  ...overrides,
});

describe('trading wizard presenter', () => {
  it('keeps the cascade steps ordered from macro to entry timing', () => {
    expect(TRADING_WIZARD_STEPS.map((step) => step.interval)).toEqual(['1d', '4h', '1h', '15m']);
    expect(TRADING_WIZARD_STEPS.map((step) => step.candleLimit)).toEqual([300, 180, 720, 1000]);
  });

  it('calculates view metrics from a candle window', () => {
    const result = calculateWizardMetrics([
      candle(),
      candle({ openTime: 1_700_086_400_000, close: 132, high: 140, low: 105, volume: 2500 }),
    ]);
    expect(result).toMatchObject({
      candleCount: 2,
      high: 140,
      low: 80,
      last: 132,
      priceChangePercent: 32,
      totalVolume: 4000,
    });
  });

  it('returns no metrics for an empty window and formats volume consistently', () => {
    expect(calculateWizardMetrics([])).toBeNull();
    expect(formatCompactVolume(4000)).toBe('4.0K');
    expect(formatCompactVolume(25)).toBe('25.0');
  });
});
