/**
 * Trading Bot Configuration
 *
 * Centralized configuration for all trading-related constants and thresholds.
 */

export const TRADING_CONFIG = {
  /**
   * Hurst Exponent Analysis
   */
  HURST: {
    /** Number of candles used for Hurst calculation */
    WINDOW_SIZE: 50,
    /** Threshold above which market is considered TRENDING */
    TRENDING_THRESHOLD: 0.55,
    /** Threshold below which market is considered MEAN_REVERTING */
    MEAN_REVERTING_THRESHOLD: 0.45,
  },

  /**
   * Fractal Detection (Bill Williams)
   */
  FRACTALS: {
    /** Number of bars for fractal pattern (must be odd) */
    LOOKBACK_PERIOD: 5,
  },

  /**
   * Data Fetching & Display
   */
  CANDLES: {
    /** Default number of historical candles to fetch */
    DEFAULT_FETCH_LIMIT: 100,
    /** Number of candles to display in UI */
    DISPLAY_LIMIT: 20,
    /** Minimum candles required for meaningful analysis */
    MIN_FOR_ANALYSIS: 50,
  },

  /**
   * LLM Advisor Configuration
   */
  LLM: {
    /** Maximum tokens for LLM response */
    MAX_TOKENS: 1500,
    /** Temperature for response creativity (0-1) */
    TEMPERATURE: 0.5,
    /** Default model to use */
    DEFAULT_MODEL: 'gemini-2.5-flash',
    /** Maximum age of cached insight (milliseconds) */
    MAX_INSIGHT_AGE_MS: 5 * 60 * 1000, // 5 minutes
  },

  /**
   * WebSocket & Streaming
   */
  STREAM: {
    /** Binance WebSocket base URL */
    BINANCE_WS_URL: 'wss://stream.binance.com:9443/ws',
    /** Reconnection delay on disconnect (milliseconds) */
    RECONNECT_DELAY_MS: 3000,
  },
} as const;

/**
 * Type-safe access to configuration values
 */
export type TradingConfig = typeof TRADING_CONFIG;
