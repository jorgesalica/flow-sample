/**
 * Binance REST API Client
 *
 * Fetches historical kline (candlestick) data from Binance REST API.
 * Used for multi-timeframe analysis in the Cascade Wizard.
 */

import type { Candle } from './types';
import type { TradingKlineInterval } from '@flows/shared';
import { logger } from '@flows/core';

const log = logger.child({ module: 'BinanceRestAdapter' });

const BINANCE_REST_BASE = 'https://api.binance.com/api/v3';

export type KlineInterval = TradingKlineInterval;

interface BinanceKline {
  0: number; // Open time
  1: string; // Open
  2: string; // High
  3: string; // Low
  4: string; // Close
  5: string; // Volume
  6: number; // Close time
  7: string; // Quote asset volume
  8: number; // Number of trades
  9: string; // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

/**
 * Fetch historical klines from Binance REST API.
 *
 * @param symbol Trading pair (e.g., 'BTCUSDT')
 * @param interval Kline interval (e.g., '1d', '4h', '1h', '15m')
 * @param limit Number of klines to fetch (max 1000)
 * @returns Array of Candle objects
 */
export async function fetchKlines(
  symbol: string,
  interval: KlineInterval,
  limit: number = 100,
): Promise<Candle[]> {
  const url = new URL(`${BINANCE_REST_BASE}/klines`);
  url.searchParams.set('symbol', symbol.toUpperCase());
  url.searchParams.set('interval', interval);
  url.searchParams.set('limit', Math.min(limit, 1000).toString());

  log.debug({ symbol, interval, limit }, 'Fetching historical klines');

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, response: errorText }, 'Binance API error');
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = (await response.json()) as BinanceKline[];

    const candles: Candle[] = data.map((kline) => ({
      symbol: symbol.toUpperCase(),
      interval,
      openTime: kline[0],
      closeTime: kline[6],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      isClosed: true, // Historical klines are always closed
    }));

    log.debug({ symbol, interval, count: candles.length }, 'Historical klines fetched');
    return candles;
  } catch (error) {
    log.error({ error }, 'Failed to fetch historical klines');
    throw error;
  }
}

export default { fetchKlines };
