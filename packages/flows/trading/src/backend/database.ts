import { createDatabase } from '@flows/core';
import type Database from 'better-sqlite3';

const TRADING_DATABASE_NAME = 'trading.db';

export interface CandleRow {
  id: number;
  symbol: string;
  interval: string;
  open_time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  close_time: number;
}

export interface FractalNodeRow {
  id: number;
  symbol: string;
  type: 'high' | 'low';
  price: number;
  candle_open_time: number;
  detected_at: number;
}

export interface AdvisorLogRow {
  id: number;
  timestamp: number;
  symbol: string;
  regime: string | null;
  insight_json: string;
  market_state_json: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
}

export interface CandleWrite {
  symbol: string;
  interval: string;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface FractalNodeWrite {
  symbol: string;
  type: 'high' | 'low';
  price: number;
  candleOpenTime: number;
  detectedAt: number;
}

export interface AdvisorLogWrite {
  timestamp: number;
  symbol: string;
  regime: string;
  insightJson: string;
  marketStateJson: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface TradingPersistence {
  upsertCandle(candle: CandleWrite): void;
  getLastCandles(symbol: string, interval: string, limit: number): CandleRow[];
  getLastCandle(symbol: string, interval: string): CandleRow | null;
  getCandleCount(symbol: string): number;
  insertFractalNode(node: FractalNodeWrite): void;
  getLastFractalNodes(symbol: string, limit: number): FractalNodeRow[];
  insertAdvisorLog(log: AdvisorLogWrite): void;
  getLatestAdvisorLog(symbol: string): AdvisorLogRow | null;
}

export function createTradingDatabase(dataDir?: string): Database.Database {
  const db = createDatabase(TRADING_DATABASE_NAME, dataDir);
  initializeTradingDatabase(db);
  return db;
}

export function initializeTradingDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS candles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      interval TEXT NOT NULL,
      open_time INTEGER NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL,
      close_time INTEGER NOT NULL,
      UNIQUE(symbol, interval, open_time)
    );
    CREATE INDEX IF NOT EXISTS idx_candles_time
      ON candles(symbol, interval, open_time DESC);

    CREATE TABLE IF NOT EXISTS fractal_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('high', 'low')),
      price REAL NOT NULL,
      candle_open_time INTEGER NOT NULL,
      detected_at INTEGER NOT NULL,
      UNIQUE(symbol, type, candle_open_time)
    );
    CREATE INDEX IF NOT EXISTS idx_fractal_nodes_time
      ON fractal_nodes(symbol, detected_at DESC);

    CREATE TABLE IF NOT EXISTS advisor_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      regime TEXT,
      insight_json TEXT NOT NULL,
      market_state_json TEXT,
      tokens_used INTEGER,
      latency_ms INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_advisor_logs_time
      ON advisor_logs(timestamp DESC);
  `);
}

export class SQLiteTradingPersistence implements TradingPersistence {
  private readonly upsertCandleStatement: Database.Statement;
  private readonly getLastCandlesStatement: Database.Statement;
  private readonly getLastCandleStatement: Database.Statement;
  private readonly getCandleCountStatement: Database.Statement;
  private readonly insertFractalNodeStatement: Database.Statement;
  private readonly getLastFractalNodesStatement: Database.Statement;
  private readonly insertAdvisorLogStatement: Database.Statement;
  private readonly getLatestAdvisorLogStatement: Database.Statement;

  constructor(db: Database.Database) {
    this.upsertCandleStatement = db.prepare(`
      INSERT INTO candles (symbol, interval, open_time, open, high, low, close, volume, close_time)
      VALUES (@symbol, @interval, @openTime, @open, @high, @low, @close, @volume, @closeTime)
      ON CONFLICT(symbol, interval, open_time) DO UPDATE SET
        high = MAX(candles.high, @high),
        low = MIN(candles.low, @low),
        close = @close,
        volume = @volume,
        close_time = @closeTime
    `);
    this.getLastCandlesStatement = db.prepare(`
      SELECT * FROM candles
      WHERE symbol = ? AND interval = ?
      ORDER BY open_time DESC
      LIMIT ?
    `);
    this.getLastCandleStatement = db.prepare(`
      SELECT * FROM candles
      WHERE symbol = ? AND interval = ?
      ORDER BY open_time DESC
      LIMIT 1
    `);
    this.getCandleCountStatement = db.prepare(
      'SELECT COUNT(*) as count FROM candles WHERE symbol = ?',
    );
    this.insertFractalNodeStatement = db.prepare(`
      INSERT OR IGNORE INTO fractal_nodes
        (symbol, type, price, candle_open_time, detected_at)
      VALUES (@symbol, @type, @price, @candleOpenTime, @detectedAt)
    `);
    this.getLastFractalNodesStatement = db.prepare(`
      SELECT * FROM fractal_nodes
      WHERE symbol = ?
      ORDER BY detected_at DESC
      LIMIT ?
    `);
    this.insertAdvisorLogStatement = db.prepare(`
      INSERT INTO advisor_logs
        (timestamp, symbol, regime, insight_json, market_state_json, tokens_used, latency_ms)
      VALUES
        (@timestamp, @symbol, @regime, @insightJson, @marketStateJson, @tokensUsed, @latencyMs)
    `);
    this.getLatestAdvisorLogStatement = db.prepare(`
      SELECT * FROM advisor_logs
      WHERE symbol = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);
  }

  upsertCandle(candle: CandleWrite): void {
    this.upsertCandleStatement.run(candle);
  }

  getLastCandles(symbol: string, interval: string, limit: number): CandleRow[] {
    return this.getLastCandlesStatement.all(symbol, interval, limit) as CandleRow[];
  }

  getLastCandle(symbol: string, interval: string): CandleRow | null {
    return (
      (this.getLastCandleStatement.get(symbol, interval) as CandleRow | undefined) ??
      null
    );
  }

  getCandleCount(symbol: string): number {
    const row = this.getCandleCountStatement.get(symbol) as { count: number };
    return row.count;
  }

  insertFractalNode(node: FractalNodeWrite): void {
    this.insertFractalNodeStatement.run(node);
  }

  getLastFractalNodes(symbol: string, limit: number): FractalNodeRow[] {
    return this.getLastFractalNodesStatement.all(symbol, limit) as FractalNodeRow[];
  }

  insertAdvisorLog(log: AdvisorLogWrite): void {
    this.insertAdvisorLogStatement.run(log);
  }

  getLatestAdvisorLog(symbol: string): AdvisorLogRow | null {
    return (
      (this.getLatestAdvisorLogStatement.get(symbol) as AdvisorLogRow | undefined) ??
      null
    );
  }
}

export function createTradingPersistence(dataDir?: string): TradingPersistence {
  return new SQLiteTradingPersistence(createTradingDatabase(dataDir));
}
