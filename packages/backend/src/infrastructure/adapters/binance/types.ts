/**
 * Binance WebSocket Kline (Candlestick) Types
 * https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
 */

/** Raw kline data from Binance WebSocket */
export interface BinanceKlinePayload {
  e: 'kline'; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
    B: string; // Ignore
  };
}

/** Parsed candle data (normalized) */
export interface Candle {
  symbol: string;
  interval: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

/** Connection state for the WebSocket */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** Events emitted by BinanceStream */
export interface BinanceStreamEvents {
  candle: (candle: Candle) => void;
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
}
