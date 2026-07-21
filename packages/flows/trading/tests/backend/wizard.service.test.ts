import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LLMResponse } from '@flows/core';
import type {
  AdvisorNote,
  Candle,
  MarketState,
  TradingWizardAnalysis,
} from '@flows/shared';
import {
  InsightProviderError,
  InsufficientDataError,
  InvalidInsightResponseError,
  MarketDataUnavailableError,
} from '../../src/domain/errors';
import type { TradingMarketApplication } from '../../src/backend/services/market.service';
import {
  TradingWizardService,
  type WizardMarketAnalyzer,
  type WizardSynthesizer,
} from '../../src/backend/services/wizard.service';

const candle: Candle = {
  symbol: 'BTCUSDT',
  interval: '1d',
  openTime: 1,
  closeTime: 2,
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 12,
  isClosed: true,
};

const marketState: MarketState = {
  symbol: 'BTCUSDT',
  timestamp: 1,
  regime: 'TRENDING',
  hurst: 0.65,
  fractalDimension: 1.35,
  price: { current: 105, open24h: 100, change24h: 5 },
  nodes: { all: [], support: null, resistance: null },
  indicators: {},
};

const analysis: TradingWizardAnalysis = {
  market_context: {
    symbol: 'BTCUSDT',
    timestamp: '2026-01-01T00:00:00.000Z',
    price: 105,
    price_change_24h_percent: '5.00%',
  },
  regime_analysis: {
    classification: 'TRENDING',
    hurst_exponent: '0.650',
    fractal_dimension: '1.350',
    interpretation: 'Trending',
  },
  fractal_structure: {
    nearest_resistance: 'None detected',
    distance_to_resistance: 'N/A',
    resistance_touch_count: 0,
    nearest_support: 'None detected',
    distance_to_support: 'N/A',
    support_touch_count: 0,
    active_nodes_count: 0,
  },
  candle_patterns: [],
  indicators: { rsi: 'N/A', macd: 'N/A' },
};

const previousInsight: AdvisorNote = {
  title: 'Macro trend',
  sentiment_bias: 'LONG',
  regime_context: 'Trending',
  scenario_bullish: 'Break resistance',
  scenario_bearish: 'Lose support',
  mentor_tip: 'Wait for confirmation',
  reasoning_key_factors: ['Hurst'],
  confidence_score: 70,
};

const validResponse: LLMResponse = {
  content: JSON.stringify(previousInsight),
  model: 'test-model',
  provider: 'test-provider',
  usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  latencyMs: 40,
};

const market = {
  getCandles: vi.fn<TradingMarketApplication['getCandles']>(),
  getHistoricalKlines: vi.fn<TradingMarketApplication['getHistoricalKlines']>(),
  getFractals: vi.fn<TradingMarketApplication['getFractals']>(),
  getLatestInsight: vi.fn<TradingMarketApplication['getLatestInsight']>(),
};
const analyzer = {
  analyzeCandles: vi.fn<WizardMarketAnalyzer['analyzeCandles']>(),
};
const synthesizer = {
  enrichMarketState: vi.fn<WizardSynthesizer['enrichMarketState']>(),
  buildMessages: vi.fn<WizardSynthesizer['buildMessages']>(),
};
const generate = vi.fn();
const createLlmClient = vi.fn(() => ({ providerName: 'test', generate }));

function createService(): TradingWizardService {
  return new TradingWizardService('BTCUSDT', {
    market,
    analyzer,
    synthesizer,
    createLlmClient,
  });
}

describe('TradingWizardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    market.getHistoricalKlines.mockResolvedValue([candle]);
    analyzer.analyzeCandles.mockReturnValue(marketState);
    synthesizer.enrichMarketState.mockReturnValue(analysis);
    synthesizer.buildMessages.mockReturnValue({
      messages: [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'default' },
      ],
      contextJson: '{}',
    });
    generate.mockResolvedValue(validResponse);
  });

  it('orchestrates market analysis and a typed cascade prompt', async () => {
    const result = await createService().generate({
      interval: '4h',
      limit: 200,
      stepLabel: '4H',
      promptContext: 'Analyze structure',
      previousInsights: [{ label: '1D', insight: previousInsight }],
    });

    expect(market.getHistoricalKlines).toHaveBeenCalledWith('BTCUSDT', '4h', 200);
    expect(analyzer.analyzeCandles).toHaveBeenCalledWith([candle], 'BTCUSDT');
    const request = generate.mock.calls[0][0];
    expect(request.messages.at(-1)?.content).toContain('## Wizard Step: 4H');
    expect(request.messages.at(-1)?.content).toContain('### 1D Analysis');
    expect(request.messages.at(-1)?.content).toContain('**Bias**: LONG');
    expect(result).toEqual({
      success: true,
      insight: previousInsight,
      analysis,
      meta: { interval: '4h', candleCount: 1, tokensUsed: 30, latencyMs: 40 },
    });
  });

  it('applies the existing symbol, interval, and limit defaults', async () => {
    await createService().generate({});

    expect(market.getHistoricalKlines).toHaveBeenCalledWith('BTCUSDT', '1d', 100);
  });

  it('rejects empty and analytically insufficient market windows', async () => {
    market.getHistoricalKlines.mockResolvedValueOnce([]);
    await expect(createService().generate({})).rejects.toBeInstanceOf(
      InsufficientDataError,
    );

    market.getHistoricalKlines.mockResolvedValueOnce([candle]);
    analyzer.analyzeCandles.mockReturnValueOnce(null);
    await expect(createService().generate({})).rejects.toBeInstanceOf(
      InsufficientDataError,
    );
  });

  it('preserves typed market-data failures for HTTP mapping', async () => {
    market.getHistoricalKlines.mockRejectedValue(new MarketDataUnavailableError());

    await expect(createService().generate({})).rejects.toBeInstanceOf(
      MarketDataUnavailableError,
    );
  });

  it('wraps LLM creation and request failures', async () => {
    createLlmClient.mockImplementationOnce(() => {
      throw new Error('secret provider configuration');
    });
    await expect(createService().generate({})).rejects.toBeInstanceOf(
      InsightProviderError,
    );

    generate.mockRejectedValueOnce(new Error('secret provider response'));
    await expect(createService().generate({})).rejects.toBeInstanceOf(
      InsightProviderError,
    );
  });

  it('rejects malformed LLM output through a stable domain error', async () => {
    generate.mockResolvedValueOnce({ ...validResponse, content: 'not json' });

    await expect(createService().generate({})).rejects.toBeInstanceOf(
      InvalidInsightResponseError,
    );
  });
});
