import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MarketState } from '@flows/shared';
import type { LLMResponse } from '@flows/core';
import type { TradingPersistence } from '../../src/backend/database';

// ── Mocks for every dependency edge ───────────────────────────────────

const analyzeMock = vi.fn();
const buildMessagesMock = vi.fn();
const generateMock = vi.fn<[unknown], Promise<LLMResponse>>();
const createLLMClientMock = vi.fn();

const insertAdvisorLogRun = vi.fn();
const getLatestAdvisorLogGet = vi.fn();

vi.mock('../../src/backend/services/analyst.service', () => ({
  getAnalystService: () => ({ analyze: analyzeMock }),
}));

vi.mock('../../src/backend/services/synthesizer.service', () => ({
  getSynthesizerService: () => ({ buildMessages: buildMessagesMock }),
}));

vi.mock('@flows/core', () => ({
  createLLMClient: () => createLLMClientMock(),
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

const persistence: TradingPersistence = {
  insertAdvisorLog: (log) => {
    insertAdvisorLogRun(log);
  },
  getLatestAdvisorLog: (symbol) => getLatestAdvisorLogGet(symbol) ?? null,
  upsertCandle: vi.fn(),
  getLastCandles: vi.fn(() => []),
  getLastCandle: vi.fn(() => null),
  getCandleCount: vi.fn(() => 0),
  insertFractalNode: vi.fn(),
  getLastFractalNodes: vi.fn(() => []),
};

const mentorModule = await import('../../src/backend/services/mentor.service');

class MentorService extends mentorModule.MentorService {
  constructor(symbol?: string, autoStart = false) {
    super(persistence, symbol, autoStart);
  }
}

function getMentorService(): InstanceType<typeof mentorModule.MentorService> {
  return mentorModule.getMentorService(persistence);
}

// ── Fixtures ──────────────────────────────────────────────────────────

const SYMBOL = 'BTCUSDT';
const FIXED_TS = Date.UTC(2026, 0, 15, 12, 0, 0);

function makeMarketState(): MarketState {
  return {
    symbol: SYMBOL,
    timestamp: FIXED_TS,
    regime: 'TRENDING',
    hurst: 0.62,
    fractalDimension: 1.38,
    price: { current: 100, open24h: 90, change24h: 11.11 },
    nodes: { all: [], resistance: null, support: null },
    indicators: {},
  };
}

function validInsightJson(): string {
  return JSON.stringify({
    title: 'Tendencia alcista intacta',
    sentiment_bias: 'LONG',
    regime_context: 'Hurst 0.62 indica tendencia',
    scenario_bullish: 'Cierre sobre resistencia',
    scenario_bearish: 'Cierre bajo soporte',
    risk_management: { recommended_sl: 95, invalidation_reason: 'Debajo del fractal' },
    mentor_tip: 'Esperar confirmación con patrón de vela',
    reasoning_key_factors: ['Hurst alto', '3 toques en soporte'],
    confidence_score: 72,
  });
}

function makeLLMResponse(content: string): LLMResponse {
  return {
    content,
    model: 'gemini-3-pro',
    provider: 'gemini',
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    latencyMs: 250,
  };
}

function makeLLMClient(content: string) {
  generateMock.mockResolvedValue(makeLLMResponse(content));
  return { providerName: 'gemini', generate: generateMock };
}

describe('MentorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildMessagesMock.mockReturnValue({
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'usr' },
      ],
      contextJson: '{"k":"v"}',
    });
  });

  describe('enable / disable / toggle', () => {
    it('starts disabled by default', () => {
      const svc = new MentorService(SYMBOL);
      expect(svc.getState().isEnabled).toBe(false);
      expect(createLLMClientMock).not.toHaveBeenCalled();
    });

    it('auto-starts when configured', () => {
      createLLMClientMock.mockReturnValue(makeLLMClient(validInsightJson()));
      const svc = new MentorService(SYMBOL, true);
      expect(svc.getState().isEnabled).toBe(true);
      expect(createLLMClientMock).toHaveBeenCalled();
    });

    it('enable() creates the LLM client and flips state on', () => {
      createLLMClientMock.mockReturnValue(makeLLMClient(validInsightJson()));
      const svc = new MentorService(SYMBOL);
      svc.enable();
      expect(svc.getState().isEnabled).toBe(true);
    });

    it('enable() is a no-op when already enabled', () => {
      createLLMClientMock.mockReturnValue(makeLLMClient(validInsightJson()));
      const svc = new MentorService(SYMBOL);
      svc.enable();
      svc.enable();
      expect(createLLMClientMock).toHaveBeenCalledOnce();
    });

    it('enable() stays disabled if LLM client creation throws', () => {
      createLLMClientMock.mockImplementation(() => {
        throw new Error('no api key');
      });
      const svc = new MentorService(SYMBOL);
      svc.enable();
      expect(svc.getState().isEnabled).toBe(false);
    });

    it('disable() flips state off', () => {
      createLLMClientMock.mockReturnValue(makeLLMClient(validInsightJson()));
      const svc = new MentorService(SYMBOL);
      svc.enable();
      svc.disable();
      expect(svc.getState().isEnabled).toBe(false);
    });

    it('toggle() returns the resulting enabled state', () => {
      createLLMClientMock.mockReturnValue(makeLLMClient(validInsightJson()));
      const svc = new MentorService(SYMBOL);
      expect(svc.toggle()).toBe(true);
      expect(svc.toggle()).toBe(false);
    });
  });

  describe('generateInsight', () => {
    it('returns null when there is no market state', async () => {
      analyzeMock.mockReturnValue(null);
      const svc = new MentorService(SYMBOL);
      expect(await svc.generateInsight()).toBeNull();
      expect(buildMessagesMock).not.toHaveBeenCalled();
    });

    it('creates the LLM client on demand when not enabled', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      createLLMClientMock.mockReturnValue(makeLLMClient(validInsightJson()));
      const svc = new MentorService(SYMBOL);

      const insight = await svc.generateInsight();
      expect(createLLMClientMock).toHaveBeenCalled();
      expect(insight).not.toBeNull();
      expect(insight!.title).toBe('Tendencia alcista intacta');
    });

    it('returns null when on-demand LLM client creation fails', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      createLLMClientMock.mockImplementation(() => {
        throw new Error('no api key');
      });
      const svc = new MentorService(SYMBOL);
      expect(await svc.generateInsight()).toBeNull();
    });

    it('calls the LLM with config temperature and max tokens', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      createLLMClientMock.mockReturnValue(makeLLMClient(validInsightJson()));
      const svc = new MentorService(SYMBOL);
      await svc.generateInsight();

      expect(generateMock).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.3, maxTokens: 8192 }),
      );
    });

    it('persists the parsed insight and updates state on success', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      createLLMClientMock.mockReturnValue(makeLLMClient(validInsightJson()));
      const svc = new MentorService(SYMBOL);

      const insight = await svc.generateInsight();
      expect(insertAdvisorLogRun).toHaveBeenCalledOnce();
      const logged = insertAdvisorLogRun.mock.calls[0][0];
      expect(logged).toMatchObject({
        symbol: SYMBOL,
        regime: 'TRENDING',
        tokensUsed: 150,
        latencyMs: 250,
      });
      expect(JSON.parse(logged.insightJson).title).toBe(insight!.title);

      const state = svc.getState();
      expect(state.insightCount).toBe(1);
      expect(state.lastInsightAt).toBeInstanceOf(Date);
    });

    it('strips ```json fences before parsing', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      const fenced = '```json\n' + validInsightJson() + '\n```';
      createLLMClientMock.mockReturnValue(makeLLMClient(fenced));
      const svc = new MentorService(SYMBOL);
      const insight = await svc.generateInsight();
      expect(insight).not.toBeNull();
      expect(insight!.title).toBe('Tendencia alcista intacta');
    });

    it('returns null and does not persist when the response has no JSON', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      createLLMClientMock.mockReturnValue(makeLLMClient('Sorry, I cannot help.'));
      const svc = new MentorService(SYMBOL);
      expect(await svc.generateInsight()).toBeNull();
      expect(insertAdvisorLogRun).not.toHaveBeenCalled();
    });

    it('returns null when required fields (title/mentor_tip) are missing', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      const incomplete = JSON.stringify({ regime_context: 'x', confidence_score: 50 });
      createLLMClientMock.mockReturnValue(makeLLMClient(incomplete));
      const svc = new MentorService(SYMBOL);
      expect(await svc.generateInsight()).toBeNull();
    });

    it('defaults sentiment_bias to undefined for an invalid value', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      const weird = JSON.stringify({
        title: 'T',
        mentor_tip: 'tip',
        sentiment_bias: 'MAYBE',
        confidence_score: 50,
      });
      createLLMClientMock.mockReturnValue(makeLLMClient(weird));
      const svc = new MentorService(SYMBOL);
      const insight = await svc.generateInsight();
      expect(insight!.sentiment_bias).toBeUndefined();
    });

    it('defaults confidence_score to 50 and key factors to [] when absent', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      const minimal = JSON.stringify({ title: 'T', mentor_tip: 'tip' });
      createLLMClientMock.mockReturnValue(makeLLMClient(minimal));
      const svc = new MentorService(SYMBOL);
      const insight = await svc.generateInsight();
      expect(insight!.confidence_score).toBe(50);
      expect(insight!.reasoning_key_factors).toEqual([]);
      expect(insight!.risk_management).toBeUndefined();
    });

    it('returns null and does not throw on a 429 quota error', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      generateMock.mockRejectedValue({ status: 429, message: 'rate limited' });
      createLLMClientMock.mockReturnValue({ providerName: 'gemini', generate: generateMock });
      const svc = new MentorService(SYMBOL);
      expect(await svc.generateInsight()).toBeNull();
      expect(insertAdvisorLogRun).not.toHaveBeenCalled();
    });

    it('returns null on a generic LLM error', async () => {
      analyzeMock.mockReturnValue(makeMarketState());
      generateMock.mockRejectedValue(new Error('connection reset'));
      createLLMClientMock.mockReturnValue({ providerName: 'gemini', generate: generateMock });
      const svc = new MentorService(SYMBOL);
      expect(await svc.generateInsight()).toBeNull();
    });
  });

  describe('getLatestInsight', () => {
    it('returns null when there is no stored log', () => {
      getLatestAdvisorLogGet.mockReturnValue(null);
      const svc = new MentorService(SYMBOL);
      expect(svc.getLatestInsight()).toBeNull();
      expect(getLatestAdvisorLogGet).toHaveBeenCalledWith(SYMBOL);
    });

    it('parses and returns the stored insight with timestamp and regime', () => {
      getLatestAdvisorLogGet.mockReturnValue({
        insight_json: validInsightJson(),
        timestamp: FIXED_TS,
        regime: 'TRENDING',
      });
      const svc = new MentorService(SYMBOL);
      const result = svc.getLatestInsight();
      expect(result!.insight.title).toBe('Tendencia alcista intacta');
      expect(result!.timestamp).toBe(FIXED_TS);
      expect(result!.regime).toBe('TRENDING');
    });

    it('falls back to "unknown" regime when the column is null', () => {
      getLatestAdvisorLogGet.mockReturnValue({
        insight_json: validInsightJson(),
        timestamp: FIXED_TS,
        regime: null,
      });
      const svc = new MentorService(SYMBOL);
      expect(svc.getLatestInsight()!.regime).toBe('unknown');
    });

    it('returns null when the stored JSON is malformed', () => {
      getLatestAdvisorLogGet.mockReturnValue({
        insight_json: '{not valid json',
        timestamp: FIXED_TS,
        regime: 'TRENDING',
      });
      const svc = new MentorService(SYMBOL);
      expect(svc.getLatestInsight()).toBeNull();
    });
  });

  describe('getMentorService singleton', () => {
    it('returns the same instance across calls', () => {
      expect(getMentorService()).toBe(getMentorService());
    });
  });
});
