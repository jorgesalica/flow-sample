import { Elysia, t } from 'elysia';
import { getTradingService, getMentorService, getSynthesizerService } from '@app/trading';
import { AnalystService } from '@app/trading';
import { fetchKlines, type KlineInterval } from '@infra/adapters/binance';
import { createLLMClient } from '@infra/llm';
import {
  getLastNCandles,
  getLastNFractalNodes,
  getLatestAdvisorLog,
  type CandleRow,
  type FractalNodeRow,
  type AdvisorLogRow,
} from '@infra/persistence/sqlite/trading-database';

/**
 * Trading Flow API Routes
 *
 * Endpoints for the Trading Bot Flow (N1-N6)
 */
export function createTradingRoutes() {
  const tradingService = getTradingService();
  const mentorService = getMentorService();

  return (
    new Elysia({ prefix: '/api/trading' })

      // ============================================
      // Service Control
      // ============================================

      /** Start the data ingestion pipeline */
      .post('/start', () => {
        tradingService.start();
        return {
          success: true,
          message: 'Trading service started',
          state: tradingService.getState(),
        };
      })

      /** Stop the data ingestion pipeline */
      .post('/stop', () => {
        tradingService.stop();
        return {
          success: true,
          message: 'Trading service stopped',
          state: tradingService.getState(),
        };
      })

      /** Get current service state */
      .get('/status', () => {
        return {
          success: true,
          trading: tradingService.getState(),
          advisor: mentorService.getState(),
        };
      })

      // ============================================
      // Market Data
      // ============================================

      /** Get recent candles */
      .get(
        '/candles',
        ({ query }) => {
          const limit = query.limit ? parseInt(query.limit, 10) : 100;
          const symbol = query.symbol || process.env.TRADING_SYMBOL || 'BTCUSDT';
          const interval = query.interval || process.env.TRADING_INTERVAL || '1m';

          const candleRows = getLastNCandles.all(symbol, interval, limit) as CandleRow[];

          // Transform snake_case to camelCase for frontend
          const candles = candleRows.map((row) => ({
            id: row.id,
            symbol: row.symbol,
            interval: row.interval,
            openTime: row.open_time,
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
            volume: row.volume,
            closeTime: row.close_time,
            isClosed: true,
          }));

          return {
            success: true,
            count: candles.length,
            candles: candles.reverse(), // Oldest first for charting
          };
        },
        {
          query: t.Object({
            limit: t.Optional(t.String()),
            symbol: t.Optional(t.String()),
            interval: t.Optional(t.String()),
          }),
        },
      )

      /** Get live candle (from in-memory state) */
      .get('/candles/live', () => {
        const state = tradingService.getState();
        return {
          success: true,
          candle: state.lastCandle,
          isRunning: state.isRunning,
        };
      })

      /** Fetch historical klines from Binance for multi-timeframe analysis */
      .get(
        '/klines',
        async ({ query }) => {
          const symbol = query.symbol || process.env.TRADING_SYMBOL || 'BTCUSDT';
          const interval = (query.interval || '1d') as KlineInterval;
          const limit = query.limit ? parseInt(query.limit, 10) : 100;

          try {
            const candles = await fetchKlines(symbol, interval, limit);
            return {
              success: true,
              count: candles.length,
              symbol,
              interval,
              candles,
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to fetch klines',
            };
          }
        },
        {
          query: t.Object({
            symbol: t.Optional(t.String()),
            interval: t.Optional(t.String()),
            limit: t.Optional(t.String()),
          }),
        },
      )

      // ============================================
      // Fractal Analysis (Phase 2)
      // ============================================

      /** Get recent fractal nodes */
      .get(
        '/fractals',
        ({ query }) => {
          const limit = query.limit ? parseInt(query.limit, 10) : 50;
          const symbol = query.symbol || process.env.TRADING_SYMBOL || 'BTCUSDT';

          const nodes = getLastNFractalNodes.all(symbol, limit) as FractalNodeRow[];

          return {
            success: true,
            count: nodes.length,
            nodes,
          };
        },
        {
          query: t.Object({
            limit: t.Optional(t.String()),
            symbol: t.Optional(t.String()),
          }),
        },
      )

      // ============================================
      // Advisor (Phase 3)
      // ============================================

      /** Toggle advisor on/off */
      .post('/advisor/toggle', () => {
        const isEnabled = mentorService.toggle();
        return {
          success: true,
          active: isEnabled,
          message: isEnabled ? 'Advisor enabled' : 'Advisor disabled',
        };
      })

      /** Get advisor status */
      .get('/advisor/status', () => {
        return {
          success: true,
          ...mentorService.getState(),
        };
      })

      /** Get latest advisor insight */
      .get(
        '/insight',
        ({ query }) => {
          const symbol = query.symbol || process.env.TRADING_SYMBOL || 'BTCUSDT';
          const log = getLatestAdvisorLog.get(symbol) as AdvisorLogRow | null;

          if (!log) {
            return {
              success: true,
              insight: null,
              message: 'No insights available yet. Enable advisor or generate one manually.',
            };
          }

          return {
            success: true,
            insight: JSON.parse(log.insight_json),
            debugContext: log.market_state_json ? JSON.parse(log.market_state_json) : null,
            timestamp: log.timestamp,
            regime: log.regime,
            tokensUsed: log.tokens_used,
            latencyMs: log.latency_ms,
          };
        },
        {
          query: t.Object({
            symbol: t.Optional(t.String()),
          }),
        },
      )

      /** Generate insight on-demand (manual trigger) */
      .post('/insight/generate', async () => {
        const insight = await mentorService.generateInsight();

        if (!insight) {
          return {
            success: false,
            error: 'Failed to generate insight. Check LLM configuration and market data.',
          };
        }

        return {
          success: true,
          insight,
          message: 'Insight generated successfully',
        };
      })

      // ============================================
      // Wizard Insight (Cascade Wizard)
      // ============================================

      /** Generate insight using wizard-specific klines (not stream data) */
      .post(
        '/wizard/insight',
        async ({ body }) => {
          const symbol = body.symbol || process.env.TRADING_SYMBOL || 'BTCUSDT';
          const interval = (body.interval || '1d') as KlineInterval;
          const limit = body.limit || 100;
          const stepLabel = body.stepLabel || interval;
          const promptContext = body.promptContext || '';
          const previousInsightsRaw = body.previousInsights || [];

          try {
            // 1. Fetch klines from Binance
            console.log(`[WizardInsight] Fetching ${limit} ${interval} klines for ${symbol}...`);
            const candles = await fetchKlines(symbol, interval, limit);

            if (!candles.length) {
              return { success: false, error: 'No candles returned from Binance' };
            }

            // 2. Analyze the wizard's candles (not stream data!)
            const marketState = AnalystService.analyzeCandles(
              candles.map((c) => ({
                openTime: c.openTime,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
              })),
              symbol,
            );

            if (!marketState) {
              return { success: false, error: 'Insufficient candle data for analysis' };
            }

            // 3. Build the enriched analysis data (for UI display)
            const synthesizer = getSynthesizerService();
            const enrichedAnalysis = synthesizer.enrichMarketState(marketState);

            // 4. Build LLM prompt with wizard context
            let userContent = promptContext
              ? `## Wizard Step: ${stepLabel}\n${promptContext}\n\n`
              : '';

            // Add matrioshka context from previous steps
            if (previousInsightsRaw.length > 0) {
              userContent += `## Context from previous timeframes:\n`;
              for (const prev of previousInsightsRaw) {
                userContent += `\n### ${prev.label} Analysis:\n`;
                userContent += `- **Bias**: ${prev.insight?.sentiment_bias || 'NEUTRAL'}\n`;
                userContent += `- **Insight**: ${prev.insight?.mentor_tip || 'N/A'}\n`;
              }
              userContent += `\n`;
            }

            userContent += `## Current Market State (${interval} candles, ${candles.length} total):\n\n`;
            userContent += JSON.stringify(enrichedAnalysis, null, 2);

            const { messages } = synthesizer.buildMessages(marketState);
            // Replace the auto-generated user message with our wizard-specific one
            messages[messages.length - 1] = { role: 'user', content: userContent };

            // 5. Call LLM
            const llm = createLLMClient();

            console.log(`[WizardInsight] Calling LLM for ${stepLabel}...`);
            const response = await llm.generate({
              messages,
              temperature: 0.7,
              maxTokens: 8192, // gemini-2.5-flash is a thinking model, needs headroom for reasoning + output
            });

            let clean = response.content
              .replace(/```json/g, '')
              .replace(/```/g, '')
              .trim();
            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              return { success: false, error: 'Failed to parse LLM response as JSON' };
            }

            const insight = JSON.parse(jsonMatch[0]);

            console.log(`[WizardInsight] ${stepLabel} insight generated (${response.latencyMs}ms)`);

            return {
              success: true,
              insight,
              analysis: enrichedAnalysis,
              meta: {
                interval,
                candleCount: candles.length,
                tokensUsed: response.usage.totalTokens,
                latencyMs: response.latencyMs,
              },
            };
          } catch (error) {
            console.error('[WizardInsight] Failed:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Wizard insight generation failed',
            };
          }
        },
        {
          body: t.Object({
            symbol: t.Optional(t.String()),
            interval: t.Optional(t.String()),
            limit: t.Optional(t.Number()),
            stepLabel: t.Optional(t.String()),
            promptContext: t.Optional(t.String()),
            previousInsights: t.Optional(t.Array(t.Any())),
          }),
        },
      )

      // ============================================
      // SSE Stream (Real-time updates)
      // ============================================

      /** Server-Sent Events stream for real-time candle updates */
      .get('/stream', ({ set }) => {
        set.headers['Content-Type'] = 'text/event-stream';
        set.headers['Cache-Control'] = 'no-cache';
        set.headers['Connection'] = 'keep-alive';

        const encoder = new TextEncoder();
        let isOpen = true;

        const stream = new ReadableStream({
          start(controller) {
            // Send initial state
            const state = tradingService.getState();
            controller.enqueue(encoder.encode(`event: state\ndata: ${JSON.stringify(state)}\n\n`));

            // Listen for candle updates
            const onCandle = (candle: unknown) => {
              if (isOpen) {
                controller.enqueue(
                  encoder.encode(`event: candle\ndata: ${JSON.stringify(candle)}\n\n`),
                );
              }
            };

            const onCandleClosed = (candle: unknown) => {
              if (isOpen) {
                controller.enqueue(
                  encoder.encode(`event: candleClosed\ndata: ${JSON.stringify(candle)}\n\n`),
                );
              }
            };

            tradingService.on('candle', onCandle);
            tradingService.on('candleClosed', onCandleClosed);

            // Cleanup when stream closes
            return () => {
              isOpen = false;
              tradingService.off('candle', onCandle);
              tradingService.off('candleClosed', onCandleClosed);
            };
          },
          cancel() {
            isOpen = false;
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      })
  );
}

export default createTradingRoutes;
