import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import type { Candle, AdvisorNote, TradingState, AdvisorState } from '@flows/shared';

// --- Controllable stores + stubbed actions for the flow re-export module. ---
// This isolates the component's render STATES from the network: we drive the
// stores directly and assert what the template shows, while spying on actions.
const { stores, actions } = vi.hoisted(() => {
  // Lazy require inside the factory: svelte/store is safe to import here.
  return {
    stores: {
      tradingState: null as unknown,
      advisorState: null as unknown,
      candles: null as unknown,
      latestInsight: null as unknown,
      isLoadingInsight: null as unknown,
    },
    actions: {
      fetchTradingStatus: vi.fn(),
      startTrading: vi.fn(),
      stopTrading: vi.fn(),
      fetchCandles: vi.fn(),
      fetchKlines: vi.fn(async () => []),
      toggleAdvisor: vi.fn(),
      generateInsight: vi.fn(),
      generateWizardInsight: vi.fn(async () => null),
      fetchLatestInsight: vi.fn(),
      connectToStream: vi.fn(),
      disconnectFromStream: vi.fn(),
    },
  };
});

vi.mock('./trading', async () => {
  const { writable: w } = await import('svelte/store');
  stores.tradingState = w<TradingState>({
    isRunning: false,
    symbol: 'BTCUSDT',
    interval: '1m',
    lastCandle: null,
    candleCount: 0,
    connectedAt: null,
  });
  stores.advisorState = w<AdvisorState>({
    isEnabled: false,
    lastInsightAt: null,
    insightCount: 0,
  });
  stores.candles = w<Candle[]>([]);
  stores.latestInsight = w<AdvisorNote | null>(null);
  stores.isLoadingInsight = w(false);

  return {
    tradingState: stores.tradingState,
    advisorState: stores.advisorState,
    candles: stores.candles,
    latestInsight: stores.latestInsight,
    isLoadingInsight: stores.isLoadingInsight,
    ...actions,
  };
});

// StepWizard pulls in CandleChart (lightweight-charts) which needs a real
// canvas. Stub it so the wizard branch can render under jsdom.
vi.mock('./components/StepWizard.svelte', async () => ({
  default: (await import('./__stubs__/StepWizardStub.svelte')).default,
}));

import TradingFlow from './TradingFlow.svelte';

const ts = () => stores.tradingState as ReturnType<typeof writable<TradingState>>;
const ad = () => stores.advisorState as ReturnType<typeof writable<AdvisorState>>;
const cd = () => stores.candles as ReturnType<typeof writable<Candle[]>>;
const li = () => stores.latestInsight as ReturnType<typeof writable<AdvisorNote | null>>;
const lo = () => stores.isLoadingInsight as ReturnType<typeof writable<boolean>>;

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

beforeEach(() => {
  // Reset controllable stores between tests (modules are cached so stores persist).
  ts().set({
    isRunning: false,
    symbol: 'BTCUSDT',
    interval: '1m',
    lastCandle: null,
    candleCount: 0,
    connectedAt: null,
  });
  ad().set({ isEnabled: false, lastInsightAt: null, insightCount: 0 });
  cd().set([]);
  li().set(null);
  lo().set(false);
});

describe('TradingFlow — mount lifecycle', () => {
  it('hydrates on mount: fetches status/candles/insight and opens the stream', () => {
    render(TradingFlow);
    expect(actions.fetchTradingStatus).toHaveBeenCalledOnce();
    expect(actions.fetchCandles).toHaveBeenCalledWith(100);
    expect(actions.fetchLatestInsight).toHaveBeenCalledOnce();
    expect(actions.connectToStream).toHaveBeenCalledOnce();
  });
});

describe('TradingFlow — status panel', () => {
  it('shows Disconnected and a start button when not running', () => {
    render(TradingFlow);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText(/Start Stream/)).toBeInTheDocument();
    // Negative space: no stop button in the stopped state.
    expect(screen.queryByText(/Stop Stream/)).not.toBeInTheDocument();
  });

  it('shows Connected and a stop button when running', async () => {
    render(TradingFlow);
    ts().set({
      isRunning: true,
      symbol: 'BTCUSDT',
      interval: '1m',
      lastCandle: makeCandle({ close: 105 }),
      candleCount: 50,
      connectedAt: '2023-11-14T22:13:20.000Z',
    });
    await tick();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText(/Stop Stream/)).toBeInTheDocument();
    expect(screen.queryByText(/Start Stream/)).not.toBeInTheDocument();
  });

  it('renders the formatted last price and candle count', async () => {
    render(TradingFlow);
    ts().set({
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

  it('shows the em-dash placeholder for price when there is no candle', () => {
    render(TradingFlow);
    expect(screen.getByText('$—')).toBeInTheDocument();
  });
});

describe('TradingFlow — control buttons', () => {
  it('invokes startTrading when the start button is clicked', async () => {
    render(TradingFlow);
    await fireEvent.click(screen.getByText(/Start Stream/));
    expect(actions.startTrading).toHaveBeenCalledOnce();
  });

  it('invokes stopTrading when running and the stop button is clicked', async () => {
    render(TradingFlow);
    ts().update((s) => ({ ...s, isRunning: true }));
    await tick();
    await fireEvent.click(screen.getByText(/Stop Stream/));
    expect(actions.stopTrading).toHaveBeenCalledOnce();
  });

  it('invokes toggleAdvisor and reflects advisor on/off label', async () => {
    render(TradingFlow);
    expect(screen.getByText(/Advisor OFF/)).toBeInTheDocument();
    await fireEvent.click(screen.getByText(/Advisor OFF/));
    expect(actions.toggleAdvisor).toHaveBeenCalledOnce();

    ad().update((s) => ({ ...s, isEnabled: true }));
    await tick();
    expect(screen.getByText(/Advisor ON/)).toBeInTheDocument();
  });

  it('invokes generateInsight and disables the button while loading', async () => {
    render(TradingFlow);
    // Target the control button by role — the empty-state copy also mentions
    // "Generate Insight", so a plain text query is ambiguous.
    const btn = screen.getByRole('button', { name: /Generate Insight/ });
    await fireEvent.click(btn);
    expect(actions.generateInsight).toHaveBeenCalledOnce();

    lo().set(true);
    await tick();
    const loadingBtn = screen.getByRole('button', { name: /Generating/ });
    expect(loadingBtn).toBeInTheDocument();
    expect(loadingBtn).toBeDisabled();
  });
});

describe('TradingFlow — candle feed', () => {
  it('shows the empty-state message when there are no candles', () => {
    render(TradingFlow);
    expect(screen.getByText(/No candles yet/)).toBeInTheDocument();
  });

  it('renders candle rows with an up arrow for a green candle', async () => {
    render(TradingFlow);
    cd().set([makeCandle({ openTime: 1, open: 100, close: 105 })]);
    await tick();
    expect(screen.queryByText(/No candles yet/)).not.toBeInTheDocument();
    expect(screen.getByText('$105.00')).toBeInTheDocument();
    // 5% gain -> up arrow + percentage to 3 decimals.
    expect(screen.getByText(/↑/)).toBeInTheDocument();
    expect(screen.getByText(/5\.000%/)).toBeInTheDocument();
  });

  it('renders a down arrow for a red candle', async () => {
    render(TradingFlow);
    cd().set([makeCandle({ openTime: 2, open: 100, close: 90 })]);
    await tick();
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });
});

describe('TradingFlow — advisor insight panel', () => {
  it('shows the empty-state message when there is no insight', () => {
    render(TradingFlow);
    expect(screen.getByText(/No insights available yet/)).toBeInTheDocument();
  });

  it('renders insight title, bullish badge, scenarios and risk management', async () => {
    render(TradingFlow);
    li().set(makeNote({ sentiment_bias: 'LONG' }));
    await tick();
    expect(screen.queryByText(/No insights available yet/)).not.toBeInTheDocument();
    expect(screen.getByText('BTC Breakout Setup')).toBeInTheDocument();
    expect(screen.getByText(/BULLISH/)).toBeInTheDocument();
    expect(screen.getByText('Strong trending regime')).toBeInTheDocument();
    expect(screen.getByText('Breaks above resistance')).toBeInTheDocument();
    expect(screen.getByText('Loses key support')).toBeInTheDocument();
    expect(screen.getByText('$95,000.00')).toBeInTheDocument();
    expect(screen.getByText('Below daily low')).toBeInTheDocument();
    expect(screen.getByText('Wait for confirmation')).toBeInTheDocument();
  });

  it('renders a bearish badge for a SHORT bias', async () => {
    render(TradingFlow);
    li().set(makeNote({ sentiment_bias: 'SHORT' }));
    await tick();
    expect(screen.getByText(/BEARISH/)).toBeInTheDocument();
  });

  it('renders a neutral badge for a NEUTRAL bias', async () => {
    render(TradingFlow);
    li().set(makeNote({ sentiment_bias: 'NEUTRAL' }));
    await tick();
    expect(screen.getByText(/NEUTRAL/)).toBeInTheDocument();
  });

  it('renders the logic trace factors and confidence score', async () => {
    render(TradingFlow);
    li().set(
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
    render(TradingFlow);
    // Dashboard shows the live candle panel; wizard heading is absent.
    expect(screen.getByText('Live Candles')).toBeInTheDocument();
    expect(screen.queryByText(/Cascade Analysis Wizard/)).not.toBeInTheDocument();

    await fireEvent.click(screen.getByText(/Open Wizard/));
    expect(screen.getByText(/Cascade Analysis Wizard/)).toBeInTheDocument();
    expect(screen.queryByText('Live Candles')).not.toBeInTheDocument();

    await fireEvent.click(screen.getByText(/Back to Dashboard/));
    expect(screen.getByText('Live Candles')).toBeInTheDocument();
  });
});
