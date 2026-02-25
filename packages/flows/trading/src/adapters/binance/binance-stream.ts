import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type { BinanceKlinePayload, Candle, ConnectionState } from './types';

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * BinanceStream: Real-time WebSocket client for Binance kline (candlestick) data.
 *
 * Usage:
 * ```ts
 * const stream = new BinanceStream('BTCUSDT', '1m');
 * stream.on('candle', (candle) => console.log(candle));
 * stream.connect();
 * ```
 */
export class BinanceStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private symbol: string;
  private interval: string;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(symbol: string, interval: string = '1m') {
    super();
    this.symbol = symbol.toUpperCase();
    this.interval = interval;
  }

  /** Current connection state */
  get connectionState(): ConnectionState {
    return this.state;
  }

  /** Connect to Binance WebSocket */
  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.state = 'connecting';
    const streamName = `${this.symbol.toLowerCase()}@kline_${this.interval}`;
    const url = `${BINANCE_WS_BASE}/${streamName}`;

    console.log(`[BinanceStream] Connecting to ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.state = 'connected';
        this.reconnectAttempts = 0;
        console.log(`[BinanceStream] Connected to ${this.symbol}@${this.interval}`);
        this.emit('connected');
        this.startPingInterval();
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        this.handleMessage(data);
      });

      this.ws.on('ping', () => {
        this.ws?.pong();
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        console.log(`[BinanceStream] Disconnected (code: ${code}, reason: ${reason.toString()})`);
        this.cleanup();
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.ws.on('error', (error: Error) => {
        console.error(`[BinanceStream] Error:`, error.message);
        this.emit('error', error);
      });
    } catch (error) {
      console.error(`[BinanceStream] Failed to connect:`, error);
      this.scheduleReconnect();
    }
  }

  /** Disconnect from WebSocket */
  disconnect(): void {
    console.log(`[BinanceStream] Disconnecting...`);
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.state = 'disconnected';
    this.reconnectAttempts = 0;
  }

  /** Handle incoming WebSocket messages */
  private handleMessage(data: WebSocket.RawData): void {
    try {
      const msg = JSON.parse(data.toString()) as BinanceKlinePayload;

      if (msg.e === 'kline') {
        const kline = msg.k;
        const candle: Candle = {
          symbol: kline.s,
          interval: kline.i,
          openTime: kline.t,
          closeTime: kline.T,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
          isClosed: kline.x,
        };

        this.emit('candle', candle);
      }
    } catch (error) {
      console.error(`[BinanceStream] Failed to parse message:`, error);
    }
  }

  /** Schedule reconnection with exponential backoff */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[BinanceStream] Max reconnection attempts reached. Giving up.`);
      this.state = 'disconnected';
      return;
    }

    this.state = 'reconnecting';
    const delay = RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(
      `[BinanceStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /** Start ping interval to keep connection alive */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  /** Cleanup timers and intervals */
  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export default BinanceStream;
