import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TRADING_CONFIG, MENTOR_SYSTEM_PROMPT } from '../../src/backend/config';

describe('TRADING_CONFIG static values', () => {
  it('exposes Hurst thresholds with trending > mean-reverting', () => {
    expect(TRADING_CONFIG.HURST.WINDOW_SIZE).toBe(50);
    expect(TRADING_CONFIG.HURST.TRENDING_THRESHOLD).toBe(0.55);
    expect(TRADING_CONFIG.HURST.MEAN_REVERTING_THRESHOLD).toBe(0.45);
    expect(TRADING_CONFIG.HURST.TRENDING_THRESHOLD).toBeGreaterThan(
      TRADING_CONFIG.HURST.MEAN_REVERTING_THRESHOLD,
    );
  });

  it('uses an odd fractal lookback period (Bill Williams requirement)', () => {
    expect(TRADING_CONFIG.FRACTALS.LOOKBACK_PERIOD).toBe(5);
    expect(TRADING_CONFIG.FRACTALS.LOOKBACK_PERIOD % 2).toBe(1);
  });

  it('keeps the display limit at or below the fetch limit', () => {
    expect(TRADING_CONFIG.CANDLES.DEFAULT_FETCH_LIMIT).toBe(100);
    expect(TRADING_CONFIG.CANDLES.DISPLAY_LIMIT).toBe(20);
    expect(TRADING_CONFIG.CANDLES.MIN_FOR_ANALYSIS).toBe(50);
    expect(TRADING_CONFIG.CANDLES.DISPLAY_LIMIT).toBeLessThanOrEqual(
      TRADING_CONFIG.CANDLES.DEFAULT_FETCH_LIMIT,
    );
  });

  it('configures the LLM with a low (analytical) temperature', () => {
    expect(TRADING_CONFIG.LLM.MAX_TOKENS).toBe(8192);
    expect(TRADING_CONFIG.LLM.TEMPERATURE).toBe(0.3);
    expect(TRADING_CONFIG.LLM.TEMPERATURE).toBeGreaterThanOrEqual(0);
    expect(TRADING_CONFIG.LLM.TEMPERATURE).toBeLessThanOrEqual(1);
    expect(TRADING_CONFIG.LLM.DEFAULT_MODEL).toBe('gemini-3-pro');
  });

  it('caps cached insight age at 5 minutes', () => {
    expect(TRADING_CONFIG.LLM.MAX_INSIGHT_AGE_MS).toBe(5 * 60 * 1000);
  });

  it('points the stream at the Binance WebSocket endpoint', () => {
    expect(TRADING_CONFIG.STREAM.BINANCE_WS_URL).toBe('wss://stream.binance.com:9443/ws');
    expect(TRADING_CONFIG.STREAM.RECONNECT_DELAY_MS).toBe(3000);
  });

  it('exposes a non-empty Spanish-enforcing mentor system prompt', () => {
    expect(MENTOR_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    expect(MENTOR_SYSTEM_PROMPT).toContain('El Capitán');
    expect(MENTOR_SYSTEM_PROMPT).toContain('SPANISH');
  });
});

describe('TRADING_CONFIG.DEFAULTS environment parsing', () => {
  let origSymbol: string | undefined;
  let origInterval: string | undefined;

  beforeEach(() => {
    origSymbol = process.env.TRADING_SYMBOL;
    origInterval = process.env.TRADING_INTERVAL;
  });

  afterEach(() => {
    if (origSymbol === undefined) delete process.env.TRADING_SYMBOL;
    else process.env.TRADING_SYMBOL = origSymbol;
    if (origInterval === undefined) delete process.env.TRADING_INTERVAL;
    else process.env.TRADING_INTERVAL = origInterval;
    vi.resetModules();
  });

  it('falls back to BTCUSDT / 1m when env vars are unset', async () => {
    delete process.env.TRADING_SYMBOL;
    delete process.env.TRADING_INTERVAL;
    vi.resetModules();
    const { TRADING_CONFIG: fresh } = await import('../../src/backend/config');
    expect(fresh.DEFAULTS.SYMBOL).toBe('BTCUSDT');
    expect(fresh.DEFAULTS.INTERVAL).toBe('1m');
  });

  it('reads symbol and interval overrides from the environment', async () => {
    process.env.TRADING_SYMBOL = 'ETHUSDT';
    process.env.TRADING_INTERVAL = '15m';
    vi.resetModules();
    const { TRADING_CONFIG: fresh } = await import('../../src/backend/config');
    expect(fresh.DEFAULTS.SYMBOL).toBe('ETHUSDT');
    expect(fresh.DEFAULTS.INTERVAL).toBe('15m');
  });
});
