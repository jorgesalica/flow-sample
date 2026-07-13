import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Candle, AdvisorNote, TradingPageData } from './trading';

// --- Real runes store + stubbed actions for the flow re-export module. ---
// We re-export the genuine `tradingStore` (so the component's reactivity is the
// real thing) and drive its state directly, while spying on the action
// functions and the live-stream connectors.
const { actions } = vi.hoisted(() => ({
  actions: {
    startTrading: vi.fn(),
    stopTrading: vi.fn(),
    fetchKlines: vi.fn(async () => []),
    toggleAdvisor: vi.fn(),
    generateInsight: vi.fn(),
    generateWizardInsight: vi.fn(async () => null),
    connectToStream: vi.fn(),
    disconnectFromStream: vi.fn(),
  },
}));

vi.mock('./trading', async () => {
  const { tradingStore } = await import('./stores.svelte');
  return {
    tradingStore,
    ...actions,
  };
});

// StepWizard pulls in CandleChart (lightweight-charts) which needs a real
// canvas. Stub it so the wizard branch can render under jsdom.
vi.mock('./components/StepWizard.svelte', async () => ({
  default: (await import('./__stubs__/StepWizardStub.svelte')).default,
}));

import TradingFlow from './TradingFlow.svelte';
import { tradingStore } from './stores.svelte';

function makeCandle(overrides: Partial<Candle> = {}): Candle {
  return {
    symbol: 'BTCUSDT',
    interval: '1m',
    openTime: 1_700_000_000_000,
    closeTime: 1_700_000_059_999,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 12.5,
    isClosed: true,
    ...overrides,
  };
}

function makeNote(overrides: Partial<AdvisorNote> = {}): AdvisorNote {
  return {
    title: 'BTC Breakout Setup',
    sentiment_bias: 'LONG',
    regime_context: 'Strong trending regime',
    scenario_bullish: 'Breaks above resistance',
    scenario_bearish: 'Loses key support',
    risk_management: { recommended_sl: 95000, invalidation_reason: 'Below daily low' },
    mentor_tip: 'Wait for confirmation',
    reasoning_key_factors: ['Hurst > 0.6', 'RSI rising'],
    confidence_score: 78,
    ...overrides,
  };
}

// Empty loader payload — the default props for most render() calls. Tests that
// need seeded data either pass their own `initialData` or drive the store.
function emptyData(overrides: Partial<TradingPageData> = {}): TradingPageData {
  return {
    trading: null,
    advisor: null,
    candles: [],
    insight: null,
    ...overrides,
  };
}

beforeEach(() => {
  // The store is a module-level singleton shared across tests; reset it.
  tradingStore.reset();
});

describe('TradingFlow — mount lifecycle', () => {
  it('hydrates the store from the loaded data and opens the stream on mount', () => {
    const candle = makeCandle({ close: 105 });
    const insight = makeNote();
    render(TradingFlow, {
      props: {
        initialData: emptyData({
          trading: {
            isRunning: true,
            symbol: 'BTCUSDT',
            interval: '1m',
            lastCandle: candle,
            candleCount: 7,
            connectedAt: '2023-11-14T22:13:20.000Z',
          },
          advisor: { isEnabled: true, lastInsightAt: null, insightCount: 1 },
          candles: [candle],
          insight,
        }),
      },
    });

    // Store hydrated from the loader payload (no client-side fetch on mount).
    expect(tradingStore.tradingState.isRunning).toBe(true);
    expect(tradingStore.tradingState.candleCount).toBe(7);
    expect(tradingStore.advisorState.isEnabled).toBe(true);
    expect(tradingStore.candles).toHaveLength(1);
    expect(tradingStore.latestInsight?.title).toBe('BTC Breakout Setup');

    // The live stream still opens from the component.
    expect(actions.connectToStream).toHaveBeenCalledOnce();
  });

  it('leaves store defaults intact when the loader returns empty data', () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    expect(tradingStore.tradingState.isRunning).toBe(false);
    expect(tradingStore.candles).toEqual([]);
    expect(tradingStore.latestInsight).toBeNull();
    expect(actions.connectToStream).toHaveBeenCalledOnce();
  });
});

describe('TradingFlow — status panel', () => {
  it('shows Disconnected and a start button when not running', () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start stream/i })).toBeInTheDocument();
    // Negative space: no stop button in the stopped state.
    expect(screen.queryByRole('button', { name: /Stop stream/i })).not.toBeInTheDocument();
  });

  it('shows Connected and a stop button when running', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.setTradingState({
      isRunning: true,
      symbol: 'BTCUSDT',
      interval: '1m',
      lastCandle: makeCandle({ close: 105 }),
      candleCount: 50,
      connectedAt: '2023-11-14T22:13:20.000Z',
    });
    await tick();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stop stream/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start stream/i })).not.toBeInTheDocument();
  });

  it('renders the formatted last price and candle count', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.setTradingState({
      isRunning: true,
      symbol: 'BTCUSDT',
      interval: '1m',
      lastCandle: makeCandle({ close: 12345.6 }),
      candleCount: 1500,
      connectedAt: null,
    });
    await tick();
    expect(screen.getByText('$12,345.60')).toBeInTheDocument();
    // candleCount uses locale-default toLocaleString; the grouping separator
    // varies by the runtime's ICU locale (1,500 vs 1.500). Match either.
    expect(screen.getByText(/1[.,]500/)).toBeInTheDocument();
  });

  it('shows the unavailable placeholder for price when there is no candle', () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    expect(screen.getByText('$N/A')).toBeInTheDocument();
  });

  it('renders a zero price instead of treating it as missing', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.updateTradingState((state) => ({
      ...state,
      lastCandle: makeCandle({ close: 0 }),
    }));
    await tick();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });
});

describe('TradingFlow — control buttons', () => {
  it('invokes startTrading when the start button is clicked', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    await fireEvent.click(screen.getByRole('button', { name: /Start stream/i }));
    expect(actions.startTrading).toHaveBeenCalledOnce();
  });

  it('invokes stopTrading when running and the stop button is clicked', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.updateTradingState((s) => ({ ...s, isRunning: true }));
    await tick();
    await fireEvent.click(screen.getByRole('button', { name: /Stop stream/i }));
    expect(actions.stopTrading).toHaveBeenCalledOnce();
  });

  it('invokes toggleAdvisor and reflects advisor on/off label', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    expect(screen.getByRole('button', { name: /Advisor off/i })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /Advisor off/i }));
    expect(actions.toggleAdvisor).toHaveBeenCalledOnce();

    tradingStore.updateAdvisorState((s) => ({ ...s, isEnabled: true }));
    await tick();
    expect(screen.getByRole('button', { name: /Advisor on/i })).toBeInTheDocument();
  });

  it('invokes generateInsight and disables the button while loading', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    const btn = screen.getByRole('button', { name: /Generate insight/i });
    await fireEvent.click(btn);
    expect(actions.generateInsight).toHaveBeenCalledOnce();

    tradingStore.setLoadingInsight(true);
    await tick();
    const loadingBtn = screen.getByRole('button', { name: /Generate insight/i });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute('aria-busy', 'true');
  });
});

describe('TradingFlow — candle feed', () => {
  it('shows the empty-state message when there are no candles', () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    expect(screen.getByText(/No candles yet/)).toBeInTheDocument();
  });

  it('renders a positive candle change with semantic styling', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.setCandles([makeCandle({ openTime: 1, open: 100, close: 105 })]);
    await tick();
    expect(screen.queryByText(/No candles yet/)).not.toBeInTheDocument();
    expect(screen.getByText('$105.00')).toBeInTheDocument();
    expect(screen.getByText('+5.000%')).toHaveClass('positive');
  });

  it('renders a negative candle change with semantic styling', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.setCandles([makeCandle({ openTime: 2, open: 100, close: 90 })]);
    await tick();
    expect(screen.getByText('-10.000%')).toHaveClass('negative');
  });

  it('renders candles supplied by the loader without a client-side fetch', async () => {
    render(TradingFlow, {
      props: {
        initialData: emptyData({
          candles: [makeCandle({ openTime: 3, open: 100, close: 110 })],
        }),
      },
    });
    await tick();
    expect(screen.queryByText(/No candles yet/)).not.toBeInTheDocument();
    expect(screen.getByText('$110.00')).toBeInTheDocument();
  });
});

describe('TradingFlow — advisor insight panel', () => {
  it('shows the empty-state message when there is no insight', () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    expect(screen.getByText('No insight available')).toBeInTheDocument();
  });

  it('renders insight title, bullish badge, scenarios and risk management', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.setLatestInsight(makeNote({ sentiment_bias: 'LONG' }));
    await tick();
    expect(screen.queryByText('No insight available')).not.toBeInTheDocument();
    expect(screen.getByText('BTC Breakout Setup')).toBeInTheDocument();
    expect(screen.getByText('Bullish')).toHaveClass('ui-badge--success');
    expect(screen.getByText('Strong trending regime')).toBeInTheDocument();
    expect(screen.getByText('Breaks above resistance')).toBeInTheDocument();
    expect(screen.getByText('Loses key support')).toBeInTheDocument();
    expect(screen.getByText('$95,000.00')).toBeInTheDocument();
    expect(screen.getByText('Below daily low')).toBeInTheDocument();
    expect(screen.getByText('Wait for confirmation')).toBeInTheDocument();
  });

  it('renders an insight supplied by the loader on first paint', async () => {
    render(TradingFlow, {
      props: { initialData: emptyData({ insight: makeNote({ title: 'Loader Insight' }) }) },
    });
    await tick();
    expect(screen.queryByText('No insight available')).not.toBeInTheDocument();
    expect(screen.getByText('Loader Insight')).toBeInTheDocument();
  });

  it('renders a bearish badge for a SHORT bias', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.setLatestInsight(makeNote({ sentiment_bias: 'SHORT' }));
    await tick();
    expect(screen.getByText('Bearish')).toHaveClass('ui-badge--danger');
  });

  it('renders a neutral badge for a NEUTRAL bias', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.setLatestInsight(makeNote({ sentiment_bias: 'NEUTRAL' }));
    await tick();
    expect(screen.getByText('Neutral')).toHaveClass('ui-badge--neutral');
  });

  it('renders the logic trace factors and confidence score', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    tradingStore.setLatestInsight(
      makeNote({ reasoning_key_factors: ['Hurst > 0.6', 'RSI rising'], confidence_score: 78 })
    );
    await tick();
    expect(screen.getByText('Hurst > 0.6')).toBeInTheDocument();
    expect(screen.getByText('RSI rising')).toBeInTheDocument();
    expect(screen.getByText(/Confidence: 78%/)).toBeInTheDocument();
  });
});

describe('TradingFlow — wizard toggle', () => {
  it('switches to wizard mode and back to dashboard', async () => {
    render(TradingFlow, { props: { initialData: emptyData() } });
    // Dashboard shows the live candle panel; wizard heading is absent.
    expect(screen.getByRole('region', { name: 'Live candles' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Cascade analysis wizard/i })
    ).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: /Open wizard/i }));
    expect(screen.getByRole('heading', { name: /Cascade analysis wizard/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Live candles' })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: /Back to dashboard/i }));
    expect(screen.getByRole('region', { name: 'Live candles' })).toBeInTheDocument();
  });
});

describe('TradingFlow — semantic surfaces', () => {
  it('uses shared panels without legacy glass utilities', () => {
    const { container } = render(TradingFlow, { props: { initialData: emptyData() } });
    expect(screen.getByRole('region', { name: 'Trading controls' })).toHaveClass('ui-panel');
    expect(container.querySelector('.glass')).toBeNull();
  });
});
