import { getAnalystService } from './analyst.service';
import { getSynthesizerService } from './synthesizer.service';
import { createLLMClient, type LLMClient, logger } from '@flows/core';
import { type AdvisorNote } from '../../domain/types';
import {
  insertAdvisorLog,
  getLatestAdvisorLog,
  type AdvisorLogRow,
} from '../database';
import { TRADING_CONFIG } from '../config';
import { LLMQuotaError } from '../../domain/errors';

const log = logger.child({ module: 'MentorService' });

export interface MentorServiceState {
  isEnabled: boolean;
  lastInsightAt: Date | null;
  insightCount: number;
}

/**
 * MentorService (N5): Orchestrates the LLM-powered advisor.
 *
 * On-demand service that:
 * 1. Gets market state from AnalystService
 * 2. Synthesizes LLM prompt via SynthesizerService
 * 3. Calls LLM to generate educational insights
 * 4. Persists insights to database
 */
export class MentorService {
  private llm: LLMClient | null = null;
  private isEnabled: boolean = false;
  private lastInsightAt: Date | null = null;
  private insightCount: number = 0;
  private symbol: string;

  constructor(symbol?: string) {
    this.symbol = symbol || TRADING_CONFIG.DEFAULTS.SYMBOL;

    // Auto-start based on environment
    const autoStart = process.env.ADVISOR_AUTO_START === 'true';
    if (autoStart) {
      this.enable();
    }
  }

  /**
   * Enable the advisor (start generating insights)
   */
  enable(): void {
    if (this.isEnabled) return;

    try {
      this.llm = createLLMClient();
      this.isEnabled = true;
      log.info({ provider: this.llm.providerName }, 'MentorService enabled');
    } catch (error) {
      log.error({ error }, 'Failed to enable MentorService');
      this.llm = null;
      this.isEnabled = false;
    }
  }

  /**
   * Disable the advisor (stop generating insights)
   */
  disable(): void {
    this.isEnabled = false;
    this.llm = null;
    log.info('MentorService disabled');
  }

  /**
   * Toggle advisor on/off
   */
  toggle(): boolean {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.isEnabled;
  }

  /**
   * Get current service state
   */
  getState(): MentorServiceState {
    return {
      isEnabled: this.isEnabled,
      lastInsightAt: this.lastInsightAt,
      insightCount: this.insightCount,
    };
  }

  /**
   * Generate an insight for the current market state.
   * Can be called manually (on-demand) or automatically when enabled.
   *
   * Process:
   * 1. Fetches MarketState from AnalystService
   * 2. Checks if LLM client is initialized (creates if specific on-demand request)
   * 3. Uses SynthesizerService to build prompt from MarketState
   * 4. Calls LLM provider to generate insight
   * 5. Parses and validates response
   * 6. Persists insight to database
   *
   * @returns AdvisorNote object or null if generation failed (no data, error, etc)
   */
  async generateInsight(): Promise<AdvisorNote | null> {
    log.debug('generateInsight() called');

    const analyst = getAnalystService();
    const marketState = analyst.analyze();

    if (!marketState) {
      log.info('No market state available — need more candles');
      return null;
    }
    log.debug(
      { regime: marketState.regime, hurst: marketState.hurst, price: marketState.price.current },
      'Market state ready',
    );

    if (!this.llm) {
      try {
        this.llm = createLLMClient();
        log.info({ provider: this.llm.providerName }, 'LLM client created on demand');
      } catch (error) {
        log.error({ error }, 'LLM client creation failed');
        return null;
      }
    }

    const synthesizer = getSynthesizerService();
    const { messages, contextJson } = synthesizer.buildMessages(marketState);

    try {
      log.debug({ messageCount: messages.length }, 'Calling LLM');

      const response = await this.llm.generate({
        messages,
        temperature: TRADING_CONFIG.LLM.TEMPERATURE,
        maxTokens: TRADING_CONFIG.LLM.MAX_TOKENS,
      });

      log.debug(
        { contentLength: response.content.length, tokens: response.usage.totalTokens, latency: response.latencyMs },
        'LLM response received',
      );

      const insight = this.parseInsight(response.content);

      if (!insight) {
        log.error('Failed to parse insight from LLM response');
        return null;
      }

      insertAdvisorLog.run({
        timestamp: Date.now(),
        symbol: this.symbol,
        regime: marketState.regime,
        insightJson: JSON.stringify(insight),
        marketStateJson: contextJson,
        tokensUsed: response.usage.totalTokens,
        latencyMs: response.latencyMs,
      });

      this.lastInsightAt = new Date();
      this.insightCount++;

      log.info({ latencyMs: response.latencyMs, tokens: response.usage.totalTokens }, 'Insight generated');

      return insight;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err?.status === 429 || err?.message?.includes('quota')) {
        log.error(new LLMQuotaError().message);
      } else {
        log.error({ error }, 'LLM call failed');
      }
      return null;
    }
  }

  /**
   * Get the latest insight from the database.
   */
  getLatestInsight(): { insight: AdvisorNote; timestamp: number; regime: string } | null {
    const row = getLatestAdvisorLog.get(this.symbol) as AdvisorLogRow | null;

    if (!row) {
      return null;
    }

    try {
      const insight = JSON.parse(row.insight_json) as AdvisorNote;
      return {
        insight,
        timestamp: row.timestamp,
        regime: row.regime || 'unknown',
      };
    } catch (error) {
      log.error({ error }, 'Failed to parse stored insight JSON');
      return null;
    }
  }

  /**
   * Parse LLM response into AdvisorNote structure.
   */
  private parseInsight(content: string): AdvisorNote | null {
    try {
      let clean = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        log.error({ contentPreview: content.slice(0, 200) }, 'No JSON found in LLM response');
        return null;
      }

      clean = jsonMatch[0];
      const parsed = JSON.parse(clean) as Record<string, unknown>;

      if (!parsed.title || !parsed.mentor_tip) {
        log.error(
          { hasTitle: !!parsed.title, hasMentorTip: !!parsed.mentor_tip },
          'LLM response missing required fields',
        );
        return null;
      }

      log.debug({ title: parsed.title }, 'Insight parsed successfully');
      return {
        title: parsed.title as string,
        sentiment_bias: ['LONG', 'SHORT', 'NEUTRAL'].includes(parsed.sentiment_bias as string)
          ? (parsed.sentiment_bias as 'LONG' | 'SHORT' | 'NEUTRAL')
          : undefined,
        regime_context: (parsed.regime_context as string) || '',
        scenario_bullish: (parsed.scenario_bullish as string) || '',
        scenario_bearish: (parsed.scenario_bearish as string) || '',
        risk_management:
          parsed.risk_management &&
          typeof parsed.risk_management === 'object' &&
          (parsed.risk_management as Record<string, unknown>).recommended_sl
            ? {
                recommended_sl: Number(
                  (parsed.risk_management as Record<string, unknown>).recommended_sl,
                ),
                invalidation_reason:
                  ((parsed.risk_management as Record<string, unknown>)
                    .invalidation_reason as string) || 'Structural level',
              }
            : undefined,
        mentor_tip: parsed.mentor_tip as string,
        reasoning_key_factors: Array.isArray(parsed.reasoning_key_factors)
          ? (parsed.reasoning_key_factors as string[])
          : [],
        confidence_score:
          typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 50,
      };
    } catch (error) {
      log.error({ error, contentPreview: content.slice(0, 500) }, 'Failed to parse insight JSON');
      return null;
    }
  }
}

// Singleton
let mentorInstance: MentorService | null = null;

export function getMentorService(symbol?: string): MentorService {
  if (!mentorInstance) {
    mentorInstance = new MentorService(symbol);
  }
  return mentorInstance;
}

export default MentorService;
