import { describe, it, expect } from 'vitest';
import type { MarketState, FractalNode, CandlePatternInfo } from '@flows/shared';
import {
  SynthesizerService,
  getSynthesizerService,
} from '../../src/backend/services/synthesizer.service';
import { MENTOR_SYSTEM_PROMPT } from '../../src/backend/config';

// ── Fixtures ──────────────────────────────────────────────────────────

const SYMBOL = 'BTCUSDT';
const FIXED_TS = Date.UTC(2026, 0, 15, 12, 0, 0); // deterministic timestamp

function makeFractal(overrides: Partial<FractalNode> = {}): FractalNode {
  return {
    type: 'high',
    price: 110,
    candleOpenTime: FIXED_TS,
    ...overrides,
  };
}

function makeMarketState(overrides: Partial<MarketState> = {}): MarketState {
  return {
    symbol: SYMBOL,
    timestamp: FIXED_TS,
    regime: 'TRENDING',
    hurst: 0.62,
    fractalDimension: 1.38,
    price: {
      current: 100,
      open24h: 90,
      change24h: 11.11,
    },
    nodes: {
      all: [makeFractal(), makeFractal({ type: 'low', price: 95 })],
      resistance: makeFractal({ type: 'high', price: 110 }),
      support: makeFractal({ type: 'low', price: 95 }),
      resistanceTouchCount: 3,
      supportTouchCount: 2,
    },
    indicators: {
      rsi: 55.5,
      macd: { value: 1.2345, signal: 0.9876, histogram: 0.2469 },
    },
    candlePatterns: [
      { name: 'Martillo', type: 'bullish', significance: 'strong' } as CandlePatternInfo,
    ],
    ...overrides,
  };
}

describe('SynthesizerService.buildMessages', () => {
  const service = new SynthesizerService();

  it('puts the mentor system prompt as the first message', () => {
    const { messages } = service.buildMessages(makeMarketState());
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe(MENTOR_SYSTEM_PROMPT);
  });

  it('builds a user message that embeds the enriched context JSON', () => {
    const { messages, contextJson } = service.buildMessages(makeMarketState());
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('Analyze this market state:');
    expect(messages[1].content).toContain(contextJson);
  });

  it('returns contextJson as valid, pretty-printed JSON', () => {
    const { contextJson } = service.buildMessages(makeMarketState());
    expect(() => JSON.parse(contextJson)).not.toThrow();
    // pretty-print → contains newlines
    expect(contextJson).toContain('\n');
  });
});

describe('SynthesizerService.enrichMarketState', () => {
  const service = new SynthesizerService();

  it('computes distance to resistance and support as signed percentages', () => {
    const enriched = service.enrichMarketState(makeMarketState());
    // resistance 110 vs current 100 => +10.00%
    expect(enriched.fractal_structure.distance_to_resistance).toBe('+10.00%');
    // support 95 vs current 100 => -5.00%
    expect(enriched.fractal_structure.distance_to_support).toBe('-5.00%');
  });

  it('passes through touch counts', () => {
    const enriched = service.enrichMarketState(makeMarketState());
    expect(enriched.fractal_structure.resistance_touch_count).toBe(3);
    expect(enriched.fractal_structure.support_touch_count).toBe(2);
  });

  it('reports "None detected" / "N/A" when support and resistance are absent', () => {
    const state = makeMarketState({
      nodes: { all: [], resistance: null, support: null },
    });
    const enriched = service.enrichMarketState(state);
    expect(enriched.fractal_structure.nearest_resistance).toBe('None detected');
    expect(enriched.fractal_structure.nearest_support).toBe('None detected');
    expect(enriched.fractal_structure.distance_to_resistance).toBe('N/A');
    expect(enriched.fractal_structure.distance_to_support).toBe('N/A');
  });

  it('defaults missing touch counts to 0', () => {
    const state = makeMarketState({
      nodes: {
        all: [],
        resistance: makeFractal({ price: 110 }),
        support: makeFractal({ type: 'low', price: 95 }),
      },
    });
    const enriched = service.enrichMarketState(state);
    expect(enriched.fractal_structure.resistance_touch_count).toBe(0);
    expect(enriched.fractal_structure.support_touch_count).toBe(0);
  });

  it('formats hurst and fractal dimension to 3 decimals', () => {
    const enriched = service.enrichMarketState(makeMarketState());
    expect(enriched.regime_analysis.hurst_exponent).toBe('0.620');
    expect(enriched.regime_analysis.fractal_dimension).toBe('1.380');
    expect(enriched.regime_analysis.classification).toBe('TRENDING');
  });

  it('interprets a high hurst as strong persistency (trending)', () => {
    const enriched = service.enrichMarketState(makeMarketState({ hurst: 0.7 }));
    expect(enriched.regime_analysis.interpretation).toBe('Strong Persistency (Trending)');
  });

  it('interprets a low hurst as anti-persistency (mean reverting)', () => {
    const enriched = service.enrichMarketState(makeMarketState({ hurst: 0.3 }));
    expect(enriched.regime_analysis.interpretation).toBe(
      'Anti-Persistency (Mean Reverting/Choppy)',
    );
  });

  it('interprets a mid hurst as random walk / noise', () => {
    const enriched = service.enrichMarketState(makeMarketState({ hurst: 0.5 }));
    expect(enriched.regime_analysis.interpretation).toBe('Random Walk / Noise');
  });

  it('labels a positive MACD histogram as Bullish', () => {
    const enriched = service.enrichMarketState(makeMarketState());
    expect(enriched.indicators.macd).not.toBe('N/A');
    expect(enriched.indicators.macd.bias).toBe('Bullish');
    expect(enriched.indicators.macd.value).toBe('1.2345');
  });

  it('labels a non-positive MACD histogram as Bearish', () => {
    const state = makeMarketState({
      indicators: { rsi: 40, macd: { value: -1, signal: -0.5, histogram: -0.5 } },
    });
    const enriched = service.enrichMarketState(state);
    expect(enriched.indicators.macd.bias).toBe('Bearish');
  });

  it('reports indicators as N/A when missing', () => {
    const state = makeMarketState({ indicators: {} });
    const enriched = service.enrichMarketState(state);
    expect(enriched.indicators.rsi).toBe('N/A');
    expect(enriched.indicators.macd).toBe('N/A');
  });

  it('maps candle patterns into "name (type)" strings', () => {
    const enriched = service.enrichMarketState(makeMarketState());
    expect(enriched.candle_patterns).toEqual(['Martillo (bullish)']);
  });

  it('reports no significant patterns when there are none', () => {
    const state = makeMarketState({ candlePatterns: [] });
    const enriched = service.enrichMarketState(state);
    expect(enriched.candle_patterns).toEqual(['No significant patterns']);
  });

  it('includes symbol, ISO timestamp and active node count in context', () => {
    const enriched = service.enrichMarketState(makeMarketState());
    expect(enriched.market_context.symbol).toBe(SYMBOL);
    expect(enriched.market_context.timestamp).toBe(new Date(FIXED_TS).toISOString());
    expect(enriched.fractal_structure.active_nodes_count).toBe(2);
  });
});

describe('getSynthesizerService', () => {
  it('returns a singleton instance', () => {
    const a = getSynthesizerService();
    const b = getSynthesizerService();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(SynthesizerService);
  });
});
