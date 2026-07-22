import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import {
  initializeTradingDatabase,
  SQLiteTradingPersistence,
} from '../../src/backend/database';

const db = new Database(':memory:');
initializeTradingDatabase(db);
const persistence = new SQLiteTradingPersistence(db);

describe('SQLiteTradingPersistence', () => {
  beforeEach(() => {
    db.exec('DELETE FROM advisor_logs; DELETE FROM fractal_nodes; DELETE FROM candles;');
  });

  it('upserts candles and reads the latest rows', () => {
    persistence.upsertCandle({
      symbol: 'BTCUSDT',
      interval: '1m',
      openTime: 1,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 10,
      closeTime: 2,
    });
    persistence.upsertCandle({
      symbol: 'BTCUSDT',
      interval: '1m',
      openTime: 1,
      open: 100,
      high: 115,
      low: 95,
      close: 111,
      volume: 12,
      closeTime: 3,
    });

    expect(persistence.getCandleCount('BTCUSDT')).toBe(1);
    expect(persistence.getLastCandle('BTCUSDT', '1m')).toMatchObject({
      high: 115,
      low: 90,
      close: 111,
      close_time: 3,
    });
    expect(persistence.getLastCandles('BTCUSDT', '1m', 10)).toHaveLength(1);
  });

  it('persists unique fractal nodes', () => {
    const node = {
      symbol: 'BTCUSDT',
      type: 'high' as const,
      price: 110,
      candleOpenTime: 1,
      detectedAt: 2,
    };
    persistence.insertFractalNode(node);
    persistence.insertFractalNode(node);

    expect(persistence.getLastFractalNodes('BTCUSDT', 10)).toHaveLength(1);
    expect(persistence.getLastFractalNodes('BTCUSDT', 10)[0]).toMatchObject({
      type: 'high',
      price: 110,
    });
  });

  it('stores and retrieves the latest advisor log', () => {
    persistence.insertAdvisorLog({
      timestamp: 10,
      symbol: 'BTCUSDT',
      regime: 'TRENDING',
      insightJson: '{"title":"First"}',
      marketStateJson: '{}',
      tokensUsed: 12,
      latencyMs: 34,
    });
    persistence.insertAdvisorLog({
      timestamp: 20,
      symbol: 'BTCUSDT',
      regime: 'RANGING',
      insightJson: '{"title":"Latest"}',
      marketStateJson: '{}',
      tokensUsed: 56,
      latencyMs: 78,
    });

    expect(persistence.getLatestAdvisorLog('BTCUSDT')).toMatchObject({
      timestamp: 20,
      regime: 'RANGING',
      insight_json: '{"title":"Latest"}',
    });
    expect(persistence.getLatestAdvisorLog('ETHUSDT')).toBeNull();
  });

  it('returns null and empty collections for missing data', () => {
    expect(persistence.getLastCandle('BTCUSDT', '1m')).toBeNull();
    expect(persistence.getLastCandles('BTCUSDT', '1m', 10)).toEqual([]);
    expect(persistence.getLastFractalNodes('BTCUSDT', 10)).toEqual([]);
    expect(persistence.getCandleCount('BTCUSDT')).toBe(0);
  });
});
