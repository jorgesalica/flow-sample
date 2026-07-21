import { createLLMClient, logger } from '@flows/core';
import type {
  AdvisorNote,
  AdvisorState,
  TradingState as TradingStateDto,
} from '@flows/shared';
import { Elysia } from 'elysia';
import { fetchKlines } from '../adapters/binance';
import {
  InsightProviderError,
  InsufficientDataError,
  InvalidInsightResponseError,
  MarketDataUnavailableError,
} from '../domain/errors';
import { createTradingConfigFromEnv, type TradingRuntimeConfig } from './config';
import { SqliteTradingReadRepository } from './repository';
import {
  AnalystService,
  getMentorService,
  getSynthesizerService,
  getTradingService,
  TradingMarketService,
  TradingWizardService,
  type MentorServiceState,
  type TradingMarketApplication,
  type TradingServiceState,
  type TradingWizardApplication,
} from './services';
import {
  tradingAdvisorStatusResponseSchema,
  tradingAdvisorToggleResponseSchema,
  tradingCandlesResponseSchema,
  tradingErrorResponseSchema,
  tradingFractalQuerySchema,
  tradingFractalsResponseSchema,
  tradingGeneratedInsightResponseSchema,
  tradingHistoricalQuerySchema,
  tradingInsightResponseSchema,
  tradingKlinesResponseSchema,
  tradingLiveCandleResponseSchema,
  tradingMarketQuerySchema,
  tradingStateResponseSchema,
  tradingStatusResponseSchema,
  tradingSymbolQuerySchema,
  tradingWizardInsightRequestSchema,
  tradingWizardInsightResponseSchema,
} from './schemas';

const log = logger.child({ module: 'TradingRoutes' });
const INTERNAL_ERROR = 'Trading request failed';
const MARKET_DATA_UNAVAILABLE = 'Market data is temporarily unavailable';
const INSIGHT_UNAVAILABLE = 'AI insight is temporarily unavailable';

export interface TradingStreamApplication {
  start(): void;
  stop(): void;
  getState(): TradingServiceState;
  on(event: string, callback: (data: unknown) => void): void;
  off(event: string, callback: (data: unknown) => void): void;
}

export interface TradingMentorApplication {
  toggle(): boolean;
  getState(): MentorServiceState;
  generateInsight(): Promise<AdvisorNote | null>;
}

export interface TradingRoutesDependencies {
  trading: TradingStreamApplication;
  mentor: TradingMentorApplication;
  market: TradingMarketApplication;
  wizard: TradingWizardApplication;
}

export function createTradingRouteDependencies(
  config: TradingRuntimeConfig,
): TradingRoutesDependencies {
  const market = new TradingMarketService(
    new SqliteTradingReadRepository(),
    { fetchKlines },
  );
  const synthesizer = getSynthesizerService();

  return {
    trading: getTradingService({ symbol: config.symbol, interval: config.interval }),
    mentor: getMentorService(config.symbol, config.advisorAutoStart),
    market,
    wizard: new TradingWizardService(config.symbol, {
      market,
      analyzer: {
        analyzeCandles: (candles, symbol) =>
          AnalystService.analyzeCandles(candles, symbol),
      },
      synthesizer,
      createLlmClient: createLLMClient,
    }),
  };
}

export function createTradingRoutes(
  config: TradingRuntimeConfig = createTradingConfigFromEnv(),
  dependencies: TradingRoutesDependencies = createTradingRouteDependencies(config),
) {
  return new Elysia({ prefix: '/api/trading' })
    .post(
      '/start',
      ({ set }) => {
        try {
          dependencies.trading.start();
          return {
            success: true as const,
            message: 'Trading service started',
            state: serializeTradingState(dependencies.trading.getState()),
          };
        } catch (error) {
          logFailure(error, 'Trading service start failed');
          set.status = 503;
          return { success: false as const, error: MARKET_DATA_UNAVAILABLE };
        }
      },
      {
        response: {
          200: tradingStateResponseSchema,
          503: tradingErrorResponseSchema,
        },
      },
    )
    .post(
      '/stop',
      ({ set }) => {
        try {
          dependencies.trading.stop();
          return {
            success: true as const,
            message: 'Trading service stopped',
            state: serializeTradingState(dependencies.trading.getState()),
          };
        } catch (error) {
          logFailure(error, 'Trading service stop failed');
          set.status = 500;
          return { success: false as const, error: INTERNAL_ERROR };
        }
      },
      {
        response: {
          200: tradingStateResponseSchema,
          500: tradingErrorResponseSchema,
        },
      },
    )
    .get(
      '/status',
      () => ({
        success: true as const,
        trading: serializeTradingState(dependencies.trading.getState()),
        advisor: serializeAdvisorState(dependencies.mentor.getState()),
      }),
      { response: { 200: tradingStatusResponseSchema } },
    )
    .get(
      '/candles',
      ({ query, set }) => {
        try {
          const candles = dependencies.market.getCandles(
            query.symbol ?? config.symbol,
            query.interval ?? config.interval,
            query.limit ?? 100,
          );
          return { success: true as const, count: candles.length, candles };
        } catch (error) {
          logFailure(error, 'Trading candle query failed');
          set.status = 500;
          return { success: false as const, error: INTERNAL_ERROR };
        }
      },
      {
        query: tradingMarketQuerySchema,
        response: {
          200: tradingCandlesResponseSchema,
          500: tradingErrorResponseSchema,
        },
      },
    )
    .get(
      '/candles/live',
      () => {
        const state = dependencies.trading.getState();
        return {
          success: true as const,
          candle: state.lastCandle,
          isRunning: state.isRunning,
        };
      },
      { response: { 200: tradingLiveCandleResponseSchema } },
    )
    .get(
      '/klines',
      async ({ query, set }) => {
        const symbol = query.symbol ?? config.symbol;
        const interval = query.interval ?? '1d';
        try {
          const candles = await dependencies.market.getHistoricalKlines(
            symbol,
            interval,
            query.limit ?? 100,
          );
          return {
            success: true as const,
            count: candles.length,
            symbol,
            interval,
            candles,
          };
        } catch (error) {
          logFailure(error, 'Historical kline request failed');
          if (error instanceof MarketDataUnavailableError) {
            set.status = 502;
            return { success: false as const, error: MARKET_DATA_UNAVAILABLE };
          }
          set.status = 500;
          return { success: false as const, error: INTERNAL_ERROR };
        }
      },
      {
        query: tradingHistoricalQuerySchema,
        response: {
          200: tradingKlinesResponseSchema,
          500: tradingErrorResponseSchema,
          502: tradingErrorResponseSchema,
        },
      },
    )
    .get(
      '/fractals',
      ({ query, set }) => {
        try {
          const nodes = dependencies.market.getFractals(
            query.symbol ?? config.symbol,
            query.limit ?? 50,
          );
          return { success: true as const, count: nodes.length, nodes };
        } catch (error) {
          logFailure(error, 'Trading fractal query failed');
          set.status = 500;
          return { success: false as const, error: INTERNAL_ERROR };
        }
      },
      {
        query: tradingFractalQuerySchema,
        response: {
          200: tradingFractalsResponseSchema,
          500: tradingErrorResponseSchema,
        },
      },
    )
    .post(
      '/advisor/toggle',
      () => {
        const active = dependencies.mentor.toggle();
        return {
          success: true as const,
          active,
          message: active ? 'Advisor enabled' : 'Advisor disabled',
        };
      },
      { response: { 200: tradingAdvisorToggleResponseSchema } },
    )
    .get(
      '/advisor/status',
      () => ({
        success: true as const,
        ...serializeAdvisorState(dependencies.mentor.getState()),
      }),
      { response: { 200: tradingAdvisorStatusResponseSchema } },
    )
    .get(
      '/insight',
      ({ query, set }) => {
        try {
          const stored = dependencies.market.getLatestInsight(
            query.symbol ?? config.symbol,
          );
          if (!stored) {
            return {
              success: true as const,
              insight: null,
              debugContext: null,
              timestamp: null,
              regime: null,
              tokensUsed: null,
              latencyMs: null,
              message:
                'No insights available yet. Enable advisor or generate one manually.',
            };
          }
          return { success: true as const, ...stored };
        } catch (error) {
          logFailure(error, 'Stored insight query failed');
          set.status = 500;
          return { success: false as const, error: INTERNAL_ERROR };
        }
      },
      {
        query: tradingSymbolQuerySchema,
        response: {
          200: tradingInsightResponseSchema,
          500: tradingErrorResponseSchema,
        },
      },
    )
    .post(
      '/insight/generate',
      async ({ set }) => {
        try {
          const insight = await dependencies.mentor.generateInsight();
          if (!insight) {
            set.status = 503;
            return { success: false as const, error: INSIGHT_UNAVAILABLE };
          }
          return {
            success: true as const,
            insight,
            message: 'Insight generated successfully',
          };
        } catch (error) {
          logFailure(error, 'Advisor insight generation failed');
          set.status = 503;
          return { success: false as const, error: INSIGHT_UNAVAILABLE };
        }
      },
      {
        response: {
          200: tradingGeneratedInsightResponseSchema,
          503: tradingErrorResponseSchema,
        },
      },
    )
    .post(
      '/wizard/insight',
      async ({ body, set }) => {
        try {
          return await dependencies.wizard.generate(body);
        } catch (error) {
          logFailure(error, 'Wizard insight generation failed');
          if (error instanceof InsufficientDataError) {
            set.status = 422;
            return {
              success: false as const,
              error: 'Insufficient market data for analysis',
            };
          }
          if (error instanceof MarketDataUnavailableError) {
            set.status = 502;
            return { success: false as const, error: MARKET_DATA_UNAVAILABLE };
          }
          if (error instanceof InvalidInsightResponseError) {
            set.status = 502;
            return { success: false as const, error: INSIGHT_UNAVAILABLE };
          }
          if (error instanceof InsightProviderError) {
            set.status = 503;
            return { success: false as const, error: INSIGHT_UNAVAILABLE };
          }
          set.status = 500;
          return { success: false as const, error: INTERNAL_ERROR };
        }
      },
      {
        body: tradingWizardInsightRequestSchema,
        response: {
          200: tradingWizardInsightResponseSchema,
          422: tradingErrorResponseSchema,
          500: tradingErrorResponseSchema,
          502: tradingErrorResponseSchema,
          503: tradingErrorResponseSchema,
        },
      },
    )
    .get('/stream', ({ request }) => {
      const encoder = new TextEncoder();
      let isOpen = true;
      let unsubscribe = (): void => {};

      const close = (): void => {
        if (!isOpen) return;
        isOpen = false;
        unsubscribe();
      };

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const state = serializeTradingState(dependencies.trading.getState());
          controller.enqueue(
            encoder.encode(`event: state\ndata: ${JSON.stringify(state)}\n\n`),
          );

          const onCandle = (candle: unknown): void => {
            if (isOpen) {
              controller.enqueue(
                encoder.encode(`event: candle\ndata: ${JSON.stringify(candle)}\n\n`),
              );
            }
          };
          const onCandleClosed = (candle: unknown): void => {
            if (isOpen) {
              controller.enqueue(
                encoder.encode(
                  `event: candleClosed\ndata: ${JSON.stringify(candle)}\n\n`,
                ),
              );
            }
          };
          const onAbort = (): void => close();

          dependencies.trading.on('candle', onCandle);
          dependencies.trading.on('candleClosed', onCandleClosed);
          request.signal.addEventListener('abort', onAbort, { once: true });
          unsubscribe = () => {
            dependencies.trading.off('candle', onCandle);
            dependencies.trading.off('candleClosed', onCandleClosed);
            request.signal.removeEventListener('abort', onAbort);
          };

          if (request.signal.aborted) close();
        },
        cancel() {
          close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    });
}

function serializeTradingState(state: TradingServiceState): TradingStateDto {
  return {
    ...state,
    connectedAt: state.connectedAt?.toISOString() ?? null,
  };
}

function serializeAdvisorState(state: MentorServiceState): AdvisorState {
  return {
    ...state,
    lastInsightAt: state.lastInsightAt?.toISOString() ?? null,
  };
}

function logFailure(error: unknown, message: string): void {
  log.error(
    { error: error instanceof Error ? error.message : String(error) },
    message,
  );
}

export default createTradingRoutes;
