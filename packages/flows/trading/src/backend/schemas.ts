import { TRADING_KLINE_INTERVALS } from '@flows/shared';
import { t } from 'elysia';

export const tradingKlineIntervalSchema = t.Union([
  t.Literal(TRADING_KLINE_INTERVALS[0]),
  t.Literal(TRADING_KLINE_INTERVALS[1]),
  t.Literal(TRADING_KLINE_INTERVALS[2]),
  t.Literal(TRADING_KLINE_INTERVALS[3]),
  t.Literal(TRADING_KLINE_INTERVALS[4]),
  t.Literal(TRADING_KLINE_INTERVALS[5]),
  t.Literal(TRADING_KLINE_INTERVALS[6]),
  t.Literal(TRADING_KLINE_INTERVALS[7]),
]);

export const tradingCandleSchema = t.Object({
  symbol: t.String(),
  interval: t.String(),
  openTime: t.Number(),
  closeTime: t.Number(),
  open: t.Number(),
  high: t.Number(),
  low: t.Number(),
  close: t.Number(),
  volume: t.Number(),
  isClosed: t.Boolean(),
});

export const tradingFractalNodeSchema = t.Object({
  type: t.Union([t.Literal('high'), t.Literal('low')]),
  price: t.Number(),
  candleOpenTime: t.Number(),
});

export const tradingStateSchema = t.Object({
  isRunning: t.Boolean(),
  symbol: t.String(),
  interval: t.String(),
  lastCandle: t.Nullable(tradingCandleSchema),
  candleCount: t.Number(),
  connectedAt: t.Nullable(t.String()),
});

export const tradingAdvisorStateSchema = t.Object({
  isEnabled: t.Boolean(),
  lastInsightAt: t.Nullable(t.String()),
  insightCount: t.Number(),
});

export const tradingAdvisorNoteSchema = t.Object({
  title: t.String(),
  sentiment_bias: t.Optional(
    t.Union([t.Literal('LONG'), t.Literal('SHORT'), t.Literal('NEUTRAL')]),
  ),
  regime_context: t.String(),
  scenario_bullish: t.String(),
  scenario_bearish: t.String(),
  risk_management: t.Optional(
    t.Object({
      recommended_sl: t.Number(),
      invalidation_reason: t.String(),
    }),
  ),
  mentor_tip: t.String(),
  reasoning_key_factors: t.Array(t.String()),
  confidence_score: t.Number(),
});

const tradingWizardAnalysisSchema = t.Object({
  market_context: t.Object({
    symbol: t.String(),
    timestamp: t.String(),
    price: t.Number(),
    price_change_24h_percent: t.String(),
  }),
  regime_analysis: t.Object({
    classification: t.Union([
      t.Literal('TRENDING'),
      t.Literal('RANGING'),
      t.Literal('MEAN_REVERTING'),
      t.Literal('RANDOM'),
    ]),
    hurst_exponent: t.String(),
    fractal_dimension: t.String(),
    interpretation: t.String(),
  }),
  fractal_structure: t.Object({
    nearest_resistance: t.Union([t.Number(), t.String()]),
    distance_to_resistance: t.String(),
    resistance_touch_count: t.Number(),
    nearest_support: t.Union([t.Number(), t.String()]),
    distance_to_support: t.String(),
    support_touch_count: t.Number(),
    active_nodes_count: t.Number(),
  }),
  candle_patterns: t.Array(t.String()),
  indicators: t.Object({
    rsi: t.String(),
    macd: t.Union([
      t.Object({
        value: t.String(),
        signal: t.String(),
        histogram: t.String(),
        bias: t.Union([t.Literal('Bullish'), t.Literal('Bearish')]),
      }),
      t.Literal('N/A'),
    ]),
  }),
});

export const tradingErrorResponseSchema = t.Object({
  success: t.Literal(false),
  error: t.String(),
});

export const tradingStatusResponseSchema = t.Object({
  success: t.Literal(true),
  trading: tradingStateSchema,
  advisor: tradingAdvisorStateSchema,
});

export const tradingStateResponseSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  state: tradingStateSchema,
});

export const tradingCandlesResponseSchema = t.Object({
  success: t.Literal(true),
  count: t.Number(),
  candles: t.Array(tradingCandleSchema),
});

export const tradingKlinesResponseSchema = t.Object({
  success: t.Literal(true),
  count: t.Number(),
  symbol: t.String(),
  interval: tradingKlineIntervalSchema,
  candles: t.Array(tradingCandleSchema),
});

export const tradingLiveCandleResponseSchema = t.Object({
  success: t.Literal(true),
  candle: t.Nullable(tradingCandleSchema),
  isRunning: t.Boolean(),
});

export const tradingFractalsResponseSchema = t.Object({
  success: t.Literal(true),
  count: t.Number(),
  nodes: t.Array(tradingFractalNodeSchema),
});

export const tradingAdvisorToggleResponseSchema = t.Object({
  success: t.Literal(true),
  active: t.Boolean(),
  message: t.String(),
});

export const tradingAdvisorStatusResponseSchema = t.Object({
  success: t.Literal(true),
  isEnabled: t.Boolean(),
  lastInsightAt: t.Nullable(t.String()),
  insightCount: t.Number(),
});

export const tradingInsightResponseSchema = t.Object({
  success: t.Literal(true),
  insight: t.Nullable(tradingAdvisorNoteSchema),
  debugContext: t.Unknown(),
  timestamp: t.Nullable(t.Number()),
  regime: t.Nullable(t.String()),
  tokensUsed: t.Nullable(t.Number()),
  latencyMs: t.Nullable(t.Number()),
  message: t.Optional(t.String()),
});

export const tradingGeneratedInsightResponseSchema = t.Object({
  success: t.Literal(true),
  insight: tradingAdvisorNoteSchema,
  message: t.String(),
});

export const tradingWizardInsightResponseSchema = t.Object({
  success: t.Literal(true),
  insight: tradingAdvisorNoteSchema,
  analysis: tradingWizardAnalysisSchema,
  meta: t.Object({
    interval: tradingKlineIntervalSchema,
    candleCount: t.Number(),
    tokensUsed: t.Number(),
    latencyMs: t.Number(),
  }),
});

export const tradingMarketQuerySchema = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 1000 })),
  symbol: t.Optional(t.String({ minLength: 1 })),
  interval: t.Optional(t.String({ minLength: 1 })),
});

export const tradingHistoricalQuerySchema = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 1000 })),
  symbol: t.Optional(t.String({ minLength: 1 })),
  interval: t.Optional(tradingKlineIntervalSchema),
});

export const tradingFractalQuerySchema = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 1000 })),
  symbol: t.Optional(t.String({ minLength: 1 })),
});

export const tradingSymbolQuerySchema = t.Object({
  symbol: t.Optional(t.String({ minLength: 1 })),
});

export const tradingWizardInsightRequestSchema = t.Object({
  symbol: t.Optional(t.String({ minLength: 1 })),
  interval: t.Optional(tradingKlineIntervalSchema),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
  stepLabel: t.Optional(t.String()),
  promptContext: t.Optional(t.String()),
  previousInsights: t.Optional(
    t.Array(
      t.Object({
        label: t.String(),
        insight: tradingAdvisorNoteSchema,
      }),
    ),
  ),
});
