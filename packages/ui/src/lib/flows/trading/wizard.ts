import type { Candle } from '@flows/shared';

export interface TimeframeStep {
  id: number;
  label: string;
  interval: string;
  focus: string;
  icon: string;
  candleLimit: number;
  promptContext: string;
}

export interface WizardMetrics {
  candleCount: number;
  dateFrom: string;
  dateTo: string;
  high: number;
  low: number;
  last: number;
  priceChangePercent: number;
  volatilityPercent: number;
  totalVolume: number;
}

export const TRADING_WIZARD_STEPS: readonly TimeframeStep[] = [
  {
    id: 1,
    label: '1D',
    interval: '1d',
    focus: 'Daily Candles',
    icon: '🌍',
    candleLimit: 300,
    promptContext:
      'Analyze the last 10 MONTHS of price action using DAILY candles to determine the overall market bias. Is this a trending or ranging market? What is the dominant direction? Identify key support/resistance zones visible at this macro scale.',
  },
  {
    id: 2,
    label: '4H',
    interval: '4h',
    focus: '4-Hour Candles',
    icon: '🏗️',
    candleLimit: 180,
    promptContext:
      'Analyze the last MONTH using 4-HOUR candles to identify key structural levels. Where are the major support and resistance zones? Are there any structural shifts (higher highs/lows or lower highs/lows)?',
  },
  {
    id: 3,
    label: '1H',
    interval: '1h',
    focus: 'Hourly Candles',
    icon: '🎯',
    candleLimit: 720,
    promptContext:
      'Analyze the last MONTH using HOURLY candles to look for trade setups. Are there any candlestick patterns forming? Is price approaching a key level where a reaction is likely? What is the short-term trend direction?',
  },
  {
    id: 4,
    label: '15m',
    interval: '15m',
    focus: '15-Min Candles',
    icon: '⚡',
    candleLimit: 1000,
    promptContext:
      'Analyze the most recent price action using 15-MINUTE candles for entry timing. What is the immediate price action? Where would be the optimal entry point and stop loss? Look for micro-patterns and momentum signals.',
  },
];

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
});

export function calculateWizardMetrics(candles: Candle[]): WizardMetrics | null {
  if (candles.length === 0) return null;
  const first = candles[0];
  const last = candles[candles.length - 1];
  const high = Math.max(...candles.map((candle) => candle.high));
  const low = Math.min(...candles.map((candle) => candle.low));

  return {
    candleCount: candles.length,
    dateFrom: DATE_FORMAT.format(first.openTime),
    dateTo: DATE_FORMAT.format(last.closeTime),
    high,
    low,
    last: last.close,
    priceChangePercent: ((last.close - first.open) / first.open) * 100,
    volatilityPercent: ((high - low) / last.close) * 100,
    totalVolume: candles.reduce((sum, candle) => sum + candle.volume, 0),
  };
}

export function formatCompactVolume(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toFixed(1);
}
