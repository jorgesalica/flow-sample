import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { Candle } from '../../src/adapters/binance';
import type { TradingPersistence } from '../../src/backend/database';
import type { TradingServiceConfig } from '../../src/backend/services/trading.service';

// ── Mock the Binance adapter (the external edge) ──────────────────────
// A controllable fake stream we can drive from the tests.
class FakeBinanceStream extends EventEmitter {
  static instances: FakeBinanceStream[] = [];
  symbol: string;
  interval: string;
  connectCalls = 0;
  disconnectCalls = 0;

  constructor(symbol: string, interval: string) {
    super();
    this.symbol = symbol;
    this.interval = interval;
    FakeBinanceStream.instances.push(this);
  }

  connect(): void {
    this.connectCalls++;
  }

  disconnect(): void {
    this.disconnectCalls++;
  }
}

vi.mock('../../src/adapters/binance', () => ({
  BinanceStream: FakeBinanceStream,
}));

// ── Mock the database module (no real trading.db) ─────────────────────
const upsertRun = vi.fn();
const getLastNCandlesAll = vi.fn();
const getLastCandleGet = vi.fn();
const countGet = vi.fn(() => ({ count: 0 }));

const persistence: TradingPersistence = {
  getCandleCount: (symbol) => countGet(symbol)?.count ?? 0,
  upsertCandle: (candle) => {
    upsertRun(candle);
  },
  getLastCandles: (symbol, interval, limit) => getLastNCandlesAll(symbol, interval, limit),
  getLastCandle: (symbol, interval) => getLastCandleGet(symbol, interval) ?? null,
  insertFractalNode: vi.fn(),
  getLastFractalNodes: vi.fn(() => []),
  insertAdvisorLog: vi.fn(),
  getLatestAdvisorLog: vi.fn(() => null),
};

const tradingModule = await import('../../src/backend/services/trading.service');

class TradingService extends tradingModule.TradingService {
  constructor(config?: Partial<TradingServiceConfig>) {
    super(persistence, config);
  }
}

function getTradingService(): InstanceType<typeof tradingModule.TradingService> {
  return tradingModule.getTradingService(persistence);
}

// ── Fixtures ──────────────────────────────────────────────────────────

const SYMBOL = 'BTCUSDT';
const INTERVAL = '1m';

function makeCandle(overrides: Partial<Candle> = {}): Candle {
  return {
    symbol: SYMBOL,
    interval: INTERVAL,
    openTime: 1_700_000_000_000,
    closeTime: 1_700_000_059_999,
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 12.5,
    isClosed: false,
    ...overrides,
  };
}

describe('TradingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countGet.mockReturnValue({ count: 0 });
    FakeBinanceStream.instances = [];
  });

  describe('constructor / getState', () => {
    it('defaults symbol and interval from config when none provided', () => {
      const svc = new TradingService();
      const state = svc.getState();
      expect(state.symbol).toBe(SYMBOL);
      expect(state.interval).toBe(INTERVAL);
      expect(state.isRunning).toBe(false);
      expect(state.lastCandle).toBeNull();
      expect(state.connectedAt).toBeNull();
    });

    it('honors explicit config overrides', () => {
      const svc = new TradingService({ symbol: 'ETHUSDT', interval: '5m' });
      const state = svc.getState();
      expect(state.symbol).toBe('ETHUSDT');
      expect(state.interval).toBe('5m');
    });

    it('seeds candleCount from the database COUNT query', () => {
      countGet.mockReturnValue({ count: 42 });
      const svc = new TradingService();
      expect(svc.getState().candleCount).toBe(42);
    });

    it('returns a copy of state (not the internal reference)', () => {
      const svc = new TradingService();
      const a = svc.getState();
      const b = svc.getState();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('start / stop', () => {
    it('creates a stream with the configured symbol/interval and connects', () => {
      const svc = new TradingService({ symbol: 'ETHUSDT', interval: '15m' });
      svc.start();

      expect(FakeBinanceStream.instances).toHaveLength(1);
      const stream = FakeBinanceStream.instances[0];
      expect(stream.symbol).toBe('ETHUSDT');
      expect(stream.interval).toBe('15m');
      expect(stream.connectCalls).toBe(1);
      expect(svc.getState().isRunning).toBe(true);
    });

    it('is idempotent — a second start() does not create a second stream', () => {
      const svc = new TradingService();
      svc.start();
      svc.start();
      expect(FakeBinanceStream.instances).toHaveLength(1);
    });

    it('stop() disconnects the stream and clears running state', () => {
      const svc = new TradingService();
      svc.start();
      const stream = FakeBinanceStream.instances[0];

      svc.stop();
      expect(stream.disconnectCalls).toBe(1);
      expect(svc.getState().isRunning).toBe(false);
      expect(svc.getState().connectedAt).toBeNull();
    });

    it('stop() is a no-op when not running', () => {
      const svc = new TradingService();
      expect(() => svc.stop()).not.toThrow();
      expect(svc.getState().isRunning).toBe(false);
    });
  });

  describe('stream event handling', () => {
    it('persists each candle and updates lastCandle', () => {
      const svc = new TradingService();
      svc.start();
      const stream = FakeBinanceStream.instances[0];

      const candle = makeCandle({ isClosed: false });
      stream.emit('candle', candle);

      expect(upsertRun).toHaveBeenCalledOnce();
      expect(upsertRun).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: SYMBOL,
          interval: INTERVAL,
          openTime: candle.openTime,
          close: candle.close,
        }),
      );
      expect(svc.getState().lastCandle).toEqual(candle);
    });

    it('increments candleCount only when a candle is closed', () => {
      const svc = new TradingService();
      svc.start();
      const stream = FakeBinanceStream.instances[0];
      const startCount = svc.getState().candleCount;

      stream.emit('candle', makeCandle({ isClosed: false }));
      expect(svc.getState().candleCount).toBe(startCount);

      stream.emit('candle', makeCandle({ isClosed: true }));
      expect(svc.getState().candleCount).toBe(startCount + 1);
    });

    it('forwards candleClosed events to subscribers', () => {
      const svc = new TradingService();
      const onClosed = vi.fn();
      svc.on('candleClosed', onClosed);
      svc.start();
      const stream = FakeBinanceStream.instances[0];

      const closed = makeCandle({ isClosed: true });
      stream.emit('candle', closed);
      expect(onClosed).toHaveBeenCalledWith(closed);
    });

    it('does not throw and still emits when persistence fails', () => {
      upsertRun.mockImplementationOnce(() => {
        throw new Error('disk full');
      });
      const svc = new TradingService();
      const onCandle = vi.fn();
      svc.on('candle', onCandle);
      svc.start();
      const stream = FakeBinanceStream.instances[0];

      const candle = makeCandle();
      expect(() => stream.emit('candle', candle)).not.toThrow();
      expect(onCandle).toHaveBeenCalledWith(candle);
    });

    it('sets connectedAt and emits connected on the connected event', () => {
      const svc = new TradingService();
      const onConnected = vi.fn();
      svc.on('connected', onConnected);
      svc.start();
      const stream = FakeBinanceStream.instances[0];

      stream.emit('connected');
      expect(svc.getState().connectedAt).toBeInstanceOf(Date);
      expect(onConnected).toHaveBeenCalledOnce();
    });

    it('emits disconnected on the stream disconnected event', () => {
      const svc = new TradingService();
      const onDisconnected = vi.fn();
      svc.on('disconnected', onDisconnected);
      svc.start();
      FakeBinanceStream.instances[0].emit('disconnected');
      expect(onDisconnected).toHaveBeenCalledOnce();
    });

    it('emits error with the message on a stream error', () => {
      const svc = new TradingService();
      const onError = vi.fn();
      svc.on('error', onError);
      svc.start();
      FakeBinanceStream.instances[0].emit('error', new Error('boom'));
      expect(onError).toHaveBeenCalledWith({ error: 'boom' });
    });
  });

  describe('event subscription', () => {
    it('off() removes a listener so it no longer fires', () => {
      const svc = new TradingService();
      const cb = vi.fn();
      svc.on('candle', cb);
      svc.off('candle', cb);
      svc.start();
      FakeBinanceStream.instances[0].emit('candle', makeCandle());
      expect(cb).not.toHaveBeenCalled();
    });

    it('supports multiple listeners on the same event', () => {
      const svc = new TradingService();
      const a = vi.fn();
      const b = vi.fn();
      svc.on('candle', a);
      svc.on('candle', b);
      svc.start();
      FakeBinanceStream.instances[0].emit('candle', makeCandle());
      expect(a).toHaveBeenCalledOnce();
      expect(b).toHaveBeenCalledOnce();
    });
  });

  describe('candle queries', () => {
    it('getRecentCandles delegates to getLastNCandles with symbol/interval/limit', () => {
      const rows = [{ id: 1 }];
      getLastNCandlesAll.mockReturnValue(rows);
      const svc = new TradingService();
      const result = svc.getRecentCandles(10);
      expect(getLastNCandlesAll).toHaveBeenCalledWith(SYMBOL, INTERVAL, 10);
      expect(result).toBe(rows);
    });

    it('getRecentCandles defaults the limit to 100', () => {
      getLastNCandlesAll.mockReturnValue([]);
      new TradingService().getRecentCandles();
      expect(getLastNCandlesAll).toHaveBeenCalledWith(SYMBOL, INTERVAL, 100);
    });

    it('getLastClosedCandle delegates to getLastCandle', () => {
      const row = { id: 7 };
      getLastCandleGet.mockReturnValue(row);
      const svc = new TradingService();
      expect(svc.getLastClosedCandle()).toBe(row);
      expect(getLastCandleGet).toHaveBeenCalledWith(SYMBOL, INTERVAL);
    });

    it('getLastClosedCandle returns null when there is no candle', () => {
      getLastCandleGet.mockReturnValue(null);
      expect(new TradingService().getLastClosedCandle()).toBeNull();
    });
  });

  describe('getTradingService singleton', () => {
    it('returns the same instance across calls', () => {
      const a = getTradingService();
      const b = getTradingService();
      expect(a).toBe(b);
    });
  });
});
