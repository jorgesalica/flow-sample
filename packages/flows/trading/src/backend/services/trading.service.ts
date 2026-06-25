import { BinanceStream, type Candle } from '../../adapters/binance';
import {
  tradingDb,
  upsertCandle,
  getLastNCandles,
  getLastCandle,
  type CandleRow,
} from '../database';
import { TRADING_CONFIG } from '../config';
import { logger } from '@flows/core';

const log = logger.child({ module: 'TradingService' });

export interface TradingServiceConfig {
  symbol: string;
  interval: string;
}

export interface TradingState {
  isRunning: boolean;
  symbol: string;
  interval: string;
  lastCandle: Candle | null;
  candleCount: number;
  connectedAt: Date | null;
}

/**
 * TradingService: Orchestrates the data ingestion pipeline (N1 + N2).
 *
 * - Connects to Binance WebSocket for real-time kline data
 * - Persists candles to SQLite (trading.db)
 * - Emits events for downstream services (Analyst, Mentor)
 */
export class TradingService {
  private stream: BinanceStream | null = null;
  private config: TradingServiceConfig;
  private state: TradingState;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(config?: Partial<TradingServiceConfig>) {
    this.config = {
      symbol: config?.symbol || TRADING_CONFIG.DEFAULTS.SYMBOL,
      interval: config?.interval || TRADING_CONFIG.DEFAULTS.INTERVAL,
    };

    this.state = {
      isRunning: false,
      symbol: this.config.symbol,
      interval: this.config.interval,
      lastCandle: null,
      candleCount: this.getCandleCount(),
      connectedAt: null,
    };
  }

  /** Get current service state */
  getState(): TradingState {
    return { ...this.state };
  }

  /** Start the data ingestion pipeline */
  start(): void {
    if (this.state.isRunning) {
      log.info('Already running');
      return;
    }

    log.info({ symbol: this.config.symbol, interval: this.config.interval }, 'Starting');

    this.stream = new BinanceStream(this.config.symbol, this.config.interval);

    this.stream.on('candle', (candle: Candle) => {
      this.handleCandle(candle);
    });

    this.stream.on('connected', () => {
      this.state.connectedAt = new Date();
      this.state.isRunning = true;
      this.emit('connected', { connectedAt: this.state.connectedAt });
    });

    this.stream.on('disconnected', () => {
      this.emit('disconnected', { disconnectedAt: new Date() });
    });

    this.stream.on('error', (error: Error) => {
      log.error({ error: error.message }, 'Stream error');
      this.emit('error', { error: error.message });
    });

    this.stream.connect();
    this.state.isRunning = true;
  }

  /** Stop the data ingestion pipeline */
  stop(): void {
    if (!this.state.isRunning) {
      log.info('Not running');
      return;
    }

    log.info('Stopping');
    this.stream?.disconnect();
    this.stream = null;
    this.state.isRunning = false;
    this.state.connectedAt = null;
  }

  /** Handle incoming candle data */
  private handleCandle(candle: Candle): void {
    this.state.lastCandle = candle;

    // Persist to database
    try {
      upsertCandle.run({
        symbol: candle.symbol,
        interval: candle.interval,
        openTime: candle.openTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        closeTime: candle.closeTime,
      });
    } catch (error) {
      log.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to persist candle');
    }

    // Emit events
    this.emit('candle', candle);

    if (candle.isClosed) {
      this.state.candleCount++;
      this.emit('candleClosed', candle);
    }
  }

  /** Get recent candles from database */
  getRecentCandles(limit: number = 100): CandleRow[] {
    return getLastNCandles.all(this.config.symbol, this.config.interval, limit) as CandleRow[];
  }

  /** Get the last closed candle */
  getLastClosedCandle(): CandleRow | null {
    return getLastCandle.get(this.config.symbol, this.config.interval) as CandleRow | null;
  }

  /** Get total candle count in database */
  private getCandleCount(): number {
    const result = tradingDb
      .prepare('SELECT COUNT(*) as count FROM candles WHERE symbol = ?')
      .get(this.config.symbol) as { count: number };
    return result?.count || 0;
  }

  /** Event subscription */
  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /** Remove event subscription */
  off(event: string, callback: (data: unknown) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  /** Emit event to listeners */
  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }
}

// Singleton instance
let tradingServiceInstance: TradingService | null = null;

export function getTradingService(config?: Partial<TradingServiceConfig>): TradingService {
  if (!tradingServiceInstance) {
    tradingServiceInstance = new TradingService(config);
  }
  return tradingServiceInstance;
}

export default TradingService;
