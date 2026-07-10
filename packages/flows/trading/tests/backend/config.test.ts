import { describe, it, expect } from 'vitest';
import {
  createTradingConfigFromEnv,
  TRADING_CONFIG,
  MENTOR_SYSTEM_PROMPT,
} from '../../src/backend/config';

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

describe('createTradingConfigFromEnv', () => {
  it('falls back to BTCUSDT / 1m with advisor disabled', () => {
    const config = createTradingConfigFromEnv({});
    expect(config).toEqual({ symbol: 'BTCUSDT', interval: '1m', advisorAutoStart: false });
  });

  it('reads runtime overrides explicitly', () => {
    const config = createTradingConfigFromEnv({
      TRADING_SYMBOL: 'ETHUSDT',
      TRADING_INTERVAL: '15m',
      ADVISOR_AUTO_START: 'true',
    });
    expect(config).toEqual({ symbol: 'ETHUSDT', interval: '15m', advisorAutoStart: true });
  });
});
