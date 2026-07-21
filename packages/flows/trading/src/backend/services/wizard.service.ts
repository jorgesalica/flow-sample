import {
  logger,
  type LLMClient,
  type LLMMessage,
} from '@flows/core';
import type {
  Candle,
  MarketState,
  TradingWizardAnalysis,
  TradingWizardInsightRequest,
  TradingWizardInsightResponse,
} from '@flows/shared';
import { parseAdvisorNote } from '../../domain/advisor-note';
import {
  InsightProviderError,
  InsufficientDataError,
  InvalidInsightResponseError,
} from '../../domain/errors';
import type { TradingMarketApplication } from './market.service';

const log = logger.child({ module: 'TradingWizardService' });

export interface WizardMarketAnalyzer {
  analyzeCandles(candles: Candle[], symbol: string): MarketState | null;
}

export interface WizardSynthesizer {
  enrichMarketState(state: MarketState): TradingWizardAnalysis;
  buildMessages(state: MarketState): { messages: LLMMessage[]; contextJson: string };
}

export interface TradingWizardApplication {
  generate(request: TradingWizardInsightRequest): Promise<TradingWizardInsightResponse>;
}

export interface TradingWizardServiceDependencies {
  market: TradingMarketApplication;
  analyzer: WizardMarketAnalyzer;
  synthesizer: WizardSynthesizer;
  createLlmClient: () => LLMClient;
}

export class TradingWizardService implements TradingWizardApplication {
  constructor(
    private readonly defaultSymbol: string,
    private readonly dependencies: TradingWizardServiceDependencies,
  ) {}

  async generate(request: TradingWizardInsightRequest): Promise<TradingWizardInsightResponse> {
    const symbol = request.symbol ?? this.defaultSymbol;
    const interval = request.interval ?? '1d';
    const limit = request.limit ?? 100;
    const stepLabel = request.stepLabel ?? interval;

    const candles = await this.dependencies.market.getHistoricalKlines(
      symbol,
      interval,
      limit,
    );
    if (candles.length === 0) {
      throw new InsufficientDataError('No market candles are available');
    }

    const marketState = this.dependencies.analyzer.analyzeCandles(candles, symbol);
    if (!marketState) {
      throw new InsufficientDataError();
    }

    const analysis = this.dependencies.synthesizer.enrichMarketState(marketState);
    const { messages } = this.dependencies.synthesizer.buildMessages(marketState);
    const wizardPrompt = this.buildWizardPrompt(
      request,
      interval,
      stepLabel,
      candles.length,
      analysis,
    );
    const wizardMessages: LLMMessage[] = [
      ...messages.slice(0, -1),
      { role: 'user', content: wizardPrompt },
    ];

    let response: Awaited<ReturnType<LLMClient['generate']>>;
    try {
      const llm = this.dependencies.createLlmClient();
      response = await llm.generate({
        messages: wizardMessages,
        temperature: 0.7,
        maxTokens: 8192,
      });
    } catch (error) {
      log.error(
        { error: error instanceof Error ? error.message : String(error), stepLabel },
        'Wizard insight provider failed',
      );
      throw new InsightProviderError();
    }

    const insight = parseAdvisorNote(response.content);
    if (!insight) {
      log.error({ stepLabel }, 'Wizard insight response was invalid');
      throw new InvalidInsightResponseError();
    }

    return {
      success: true,
      insight,
      analysis,
      meta: {
        interval,
        candleCount: candles.length,
        tokensUsed: response.usage.totalTokens,
        latencyMs: response.latencyMs,
      },
    };
  }

  private buildWizardPrompt(
    request: TradingWizardInsightRequest,
    interval: NonNullable<TradingWizardInsightRequest['interval']>,
    stepLabel: string,
    candleCount: number,
    analysis: TradingWizardAnalysis,
  ): string {
    let content = request.promptContext
      ? `## Wizard Step: ${stepLabel}\n${request.promptContext}\n\n`
      : '';

    if (request.previousInsights?.length) {
      content += '## Context from previous timeframes:\n';
      for (const previous of request.previousInsights) {
        content += `\n### ${previous.label} Analysis:\n`;
        content += `- **Bias**: ${previous.insight.sentiment_bias ?? 'NEUTRAL'}\n`;
        content += `- **Insight**: ${previous.insight.mentor_tip}\n`;
      }
      content += '\n';
    }

    content += `## Current Market State (${interval} candles, ${candleCount} total):\n\n`;
    return content + JSON.stringify(analysis, null, 2);
  }
}
