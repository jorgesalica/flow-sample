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
import { parseAdvisorNote } from '../../domain/advisor-note';

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

  constructor(symbol?: string, autoStart: boolean = false) {
    this.symbol = symbol || TRADING_CONFIG.DEFAULTS.SYMBOL;

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

      const insight = parseAdvisorNote(response.content);

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

}

// Singleton
let mentorInstance: MentorService | null = null;

export function getMentorService(symbol?: string, autoStart: boolean = false): MentorService {
  if (!mentorInstance) {
    mentorInstance = new MentorService(symbol, autoStart);
  }
  return mentorInstance;
}

export default MentorService;
