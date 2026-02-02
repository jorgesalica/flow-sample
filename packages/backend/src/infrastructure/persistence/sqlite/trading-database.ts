import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'data', 'trading.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const tradingDb = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
tradingDb.pragma('journal_mode = WAL');

// Create schema
tradingDb.exec(`
  -- Candle data (1-minute OHLCV from Binance)
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
  CREATE INDEX IF NOT EXISTS idx_candles_time ON candles(symbol, interval, open_time DESC);

  -- Fractal nodes detected by the Analyst (N3)
  CREATE TABLE IF NOT EXISTS fractal_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('high', 'low')),
    price REAL NOT NULL,
    candle_open_time INTEGER NOT NULL,
    detected_at INTEGER NOT NULL,
    UNIQUE(symbol, type, candle_open_time)
  );
  CREATE INDEX IF NOT EXISTS idx_fractal_nodes_time ON fractal_nodes(symbol, detected_at DESC);

  -- Advisor insights (LLM-generated)
  CREATE TABLE IF NOT EXISTS advisor_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    regime TEXT,
    insight_json TEXT NOT NULL,
    market_state_json TEXT, -- Snapshotted input state for debugging/transparency
    tokens_used INTEGER,
    latency_ms INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_advisor_logs_time ON advisor_logs(timestamp DESC);
`);

// Auto-migration for existing databases (idempotent-ish)
try {
  tradingDb.exec('ALTER TABLE advisor_logs ADD COLUMN market_state_json TEXT');
} catch {
  // Column already exists or table doesn't exist yet (handled by CREATE above)
}

// Prepared statements for candles
export const upsertCandle = tradingDb.prepare(`
  INSERT INTO candles (symbol, interval, open_time, open, high, low, close, volume, close_time)
  VALUES (@symbol, @interval, @openTime, @open, @high, @low, @close, @volume, @closeTime)
  ON CONFLICT(symbol, interval, open_time) DO UPDATE SET
    high = MAX(candles.high, @high),
    low = MIN(candles.low, @low),
    close = @close,
    volume = @volume,
    close_time = @closeTime
`);

export const getLastNCandles = tradingDb.prepare(`
  SELECT * FROM candles 
  WHERE symbol = ? AND interval = ?
  ORDER BY open_time DESC 
  LIMIT ?
`);

export const getLastCandle = tradingDb.prepare(`
  SELECT * FROM candles 
  WHERE symbol = ? AND interval = ?
  ORDER BY open_time DESC 
  LIMIT 1
`);

// Prepared statements for fractal nodes
export const insertFractalNode = tradingDb.prepare(`
  INSERT OR IGNORE INTO fractal_nodes (symbol, type, price, candle_open_time, detected_at)
  VALUES (@symbol, @type, @price, @candleOpenTime, @detectedAt)
`);

export const getLastNFractalNodes = tradingDb.prepare(`
  SELECT * FROM fractal_nodes 
  WHERE symbol = ? 
  ORDER BY detected_at DESC 
  LIMIT ?
`);

// Prepared statements for advisor logs
export const insertAdvisorLog = tradingDb.prepare(`
  INSERT INTO advisor_logs (timestamp, symbol, regime, insight_json, market_state_json, tokens_used, latency_ms)
  VALUES (@timestamp, @symbol, @regime, @insightJson, @marketStateJson, @tokensUsed, @latencyMs)
`);

export const getLatestAdvisorLog = tradingDb.prepare(`
  SELECT * FROM advisor_logs 
  WHERE symbol = ?
  ORDER BY timestamp DESC 
  LIMIT 1
`);

// Types
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

export default tradingDb;
