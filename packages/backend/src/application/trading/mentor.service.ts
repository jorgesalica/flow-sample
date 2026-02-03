import { getAnalystService } from './analyst.service';
import { getSynthesizerService } from './synthesizer.service';
import { createLLMClient, type LLMClient } from '@infra/llm';
import { type AdvisorNote } from '@domain/trading/types';
import {
  insertAdvisorLog,
  getLatestAdvisorLog,
  type AdvisorLogRow,
} from '@infra/persistence/sqlite/trading-database';
import { TRADING_CONFIG } from '@config/trading.config';
import { LLMQuotaError } from '@domain/trading/errors';

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
    this.symbol = symbol || process.env.TRADING_SYMBOL || 'BTCUSDT';

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
      console.log(`[MentorService] Enabled with provider: ${this.llm.providerName}`);
    } catch (error) {
      console.error('[MentorService] Failed to enable:', error);
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
    console.log('[MentorService] Disabled');
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
    console.log('[MentorService] generateInsight() called');

    // Get current market state from analyst
    const analyst = getAnalystService();
    console.log('[MentorService] Got analyst service, calling analyze()...');
    const marketState = analyst.analyze();

    if (!marketState) {
      console.log('[MentorService] ❌ No market state available - need more candles!');
      return null;
    }
    console.log('[MentorService] ✓ Market state:', {
      regime: marketState.regime,
      hurst: marketState.hurst,
      price: marketState.price,
    });

    // If LLM not available, skip
    if (!this.llm) {
      // Try to create LLM client for one-off request
      console.log('[MentorService] LLM not initialized, creating client...');
      try {
        this.llm = createLLMClient();
        console.log('[MentorService] ✓ LLM client created:', this.llm.providerName);
      } catch (error) {
        console.error('[MentorService] ❌ LLM client creation failed:', error);
        return null;
      }
    }

    // Build prompt via synthesizer
    const synthesizer = getSynthesizerService();
    // Destructure messages and contextJson
    const { messages, contextJson } = synthesizer.buildMessages(marketState);

    try {
      // Call LLM
      console.log('[MentorService] Calling LLM with', messages.length, 'messages...');
      console.log(
        '[MentorService] Prompt preview:',
        messages[messages.length - 1]?.content?.slice(0, 200) + '...',
      );

      const response = await this.llm.generate({
        messages,
        temperature: TRADING_CONFIG.LLM.TEMPERATURE,
        maxTokens: TRADING_CONFIG.LLM.MAX_TOKENS,
      });

      console.log('[MentorService] ✓ LLM response received:', {
        contentLength: response.content.length,
        tokens: response.usage.totalTokens,
        latency: response.latencyMs,
      });
      console.log('[MentorService] Raw response preview:', response.content.slice(0, 300) + '...');

      // Parse response as JSON
      const insight = this.parseInsight(response.content);

      if (!insight) {
        console.error('[MentorService] Failed to parse insight from LLM response');
        return null;
      }

      // Persist to database
      insertAdvisorLog.run({
        timestamp: Date.now(),
        symbol: this.symbol,
        regime: marketState.regime,
        insightJson: JSON.stringify(insight),
        marketStateJson: contextJson, // Persist debug context
        tokensUsed: response.usage.totalTokens,
        latencyMs: response.latencyMs,
      });

      this.lastInsightAt = new Date();
      this.insightCount++;

      console.log(
        `[MentorService] Insight generated (${response.latencyMs}ms, ${response.usage.totalTokens} tokens)`,
      );

      return insight;
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('quota')) {
        const quotaError = new LLMQuotaError();
        console.error(`[MentorService] ${quotaError.message}`);
      } else {
        console.error('[MentorService] LLM call failed:', error);
      }
      return null;
    }
  }

  /**
   * Get the latest insight from the database.
   */
  getLatestInsight(): { insight: AdvisorNote; timestamp: number; regime: string } | null {
    const log = getLatestAdvisorLog.get(this.symbol) as AdvisorLogRow | null;

    if (!log) {
      return null;
    }

    try {
      const insight = JSON.parse(log.insight_json) as AdvisorNote;
      return {
        insight,
        timestamp: log.timestamp,
        regime: log.regime || 'unknown',
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse LLM response into AdvisorNote structure.
   */
  private parseInsight(content: string): AdvisorNote | null {
    console.log('[MentorService] Parsing insight from LLM response...');
    try {
      // Robust cleaning: remove markdown code blocks and find first { to last }
      let clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        clean = jsonMatch[0];
      } else {
        console.error('[MentorService] ❌ No JSON found in response!');
        console.debug('[MentorService] Full content:', content);
        return null;
      }

      console.log('[MentorService] Found JSON match:', clean.slice(0, 200) + '...');
      const parsed = JSON.parse(clean);
      console.log('[MentorService] Parsed object keys:', Object.keys(parsed));

      // Validate required fields
      if (!parsed.title || !parsed.mentor_tip) {
        console.error(
          '[MentorService] ❌ Missing required fields! Has title:',
          !!parsed.title,
          'Has mentor_tip:',
          !!parsed.mentor_tip,
        );
        return null;
      }

      console.log('[MentorService] ✓ Insight parsed successfully:', parsed.title);
      return {
        title: parsed.title,
        sentiment_bias: ['LONG', 'SHORT', 'NEUTRAL'].includes(parsed.sentiment_bias)
          ? parsed.sentiment_bias
          : undefined,
        regime_context: parsed.regime_context || '',
        scenario_bullish: parsed.scenario_bullish || '',
        scenario_bearish: parsed.scenario_bearish || '',
        risk_management: parsed.risk_management?.recommended_sl
          ? {
            recommended_sl: parsed.risk_management.recommended_sl,
            invalidation_reason: parsed.risk_management.invalidation_reason || 'Structural level',
          }
          : undefined,
        mentor_tip: parsed.mentor_tip,
        reasoning_key_factors: Array.isArray(parsed.reasoning_key_factors)
          ? parsed.reasoning_key_factors
          : [],
        confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 50,
      };
    } catch (error) {
      console.error('[MentorService] ❌ JSON parse error:', error);
      console.error('[MentorService] Raw content was:', content.slice(0, 500));
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
