import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Candle, AdvisorNote } from '@flows/shared';

// CandleChart wraps lightweight-charts (needs a real canvas/WebGL). Stub it so
// StepWizard renders under jsdom; we only assert StepWizard's own logic.
vi.mock('./CandleChart.svelte', async () => ({
  default: (await import('../__stubs__/CandleChartStub.svelte')).default,
}));

import StepWizard from './StepWizard.svelte';

function makeCandle(overrides: Partial<Candle> = {}): Candle {
  return {
    symbol: 'BTCUSDT',
    interval: '1d',
    openTime: 1_700_000_000_000,
    closeTime: 1_700_086_400_000,
    open: 100,
    high: 120,
    low: 80,
    close: 110,
    volume: 1500,
    isClosed: true,
    ...overrides,
  };
}

function makeNote(overrides: Partial<AdvisorNote> = {}): AdvisorNote {
  return {
    title: 'Daily Macro Bias',
    sentiment_bias: 'LONG',
    regime_context: 'Trending',
    scenario_bullish: 'Continuation up',
    scenario_bearish: 'Reversal down',
    mentor_tip: 'Respect the daily trend',
    reasoning_key_factors: ['Higher highs'],
    confidence_score: 80,
    ...overrides,
  };
}

// Default callbacks: fetch returns a fixed two-candle window.
function defaultFetch() {
  return vi.fn(
    async () =>
      [
        makeCandle({
          openTime: 1_700_000_000_000,
          open: 100,
          close: 110,
          high: 120,
          low: 80,
          volume: 1500,
        }),
        makeCandle({
          openTime: 1_700_086_400_000,
          open: 110,
          close: 132,
          high: 140,
          low: 105,
          volume: 2500,
        }),
      ] as Candle[]
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StepWizard — initial render & first step', () => {
  it('loads the first step (1D / daily) candles on mount', async () => {
    const onFetchKlines = defaultFetch();
    render(StepWizard, { props: { onFetchKlines } });

    await waitFor(() => expect(onFetchKlines).toHaveBeenCalled());
    // First step is the 1D step: interval '1d', candleLimit 300.
    expect(onFetchKlines).toHaveBeenCalledWith('1d', 300);
    expect(screen.getByText(/Step 1: Daily Candles/)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
  });

  it('renders the four timeframe step buttons', async () => {
    const onFetchKlines = defaultFetch();
    const { container } = render(StepWizard, { props: { onFetchKlines } });
    await tick();
    for (const label of ['1D', '4H', '1H', '15m']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: '1D' })).toHaveAttribute('aria-current', 'step');
    expect(container.querySelector('.glass')).toBeNull();
  });

  it('disables Previous on the first step and enables Next', async () => {
    const onFetchKlines = defaultFetch();
    render(StepWizard, { props: { onFetchKlines } });
    await tick();
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).not.toBeDisabled();
  });
});

describe('StepWizard — computed metrics', () => {
  it('renders candle count, interval, last price and computed variation', async () => {
    const onFetchKlines = defaultFetch();
    render(StepWizard, { props: { onFetchKlines } });

    await waitFor(() => expect(onFetchKlines).toHaveBeenCalled());
    await tick();

    // 2 candles fetched.
    expect(screen.getByText('2')).toBeInTheDocument();
    // Interval label for first step.
    expect(screen.getAllByText('1d').length).toBeGreaterThan(0);
    // priceChange = (132 - 100) / 100 = +32.00%
    expect(screen.getByText('+32.00%')).toBeInTheDocument();
  });

  it('shows the no-data message when fetch returns an empty window', async () => {
    const onFetchKlines = vi.fn(async () => [] as Candle[]);
    render(StepWizard, { props: { onFetchKlines } });
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalled());
    await tick();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});

describe('StepWizard — navigation', () => {
  it('advances to the next step and fetches that timeframe', async () => {
    const onFetchKlines = defaultFetch();
    render(StepWizard, { props: { onFetchKlines } });
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalledWith('1d', 300));

    await fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    // Step 2 is 4H / interval '4h' / limit 180.
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalledWith('4h', 180));
    expect(screen.getByText(/Step 2: 4-Hour Candles/)).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous/ })).not.toBeDisabled();
  });

  it('jumps directly to a step via its nav button', async () => {
    const onFetchKlines = defaultFetch();
    render(StepWizard, { props: { onFetchKlines } });
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalled());

    await fireEvent.click(screen.getByRole('button', { name: /15m/ }));
    // 15m step: interval '15m', limit 1000.
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalledWith('15m', 1000));
    expect(screen.getByText(/Step 4 of 4/)).toBeInTheDocument();
    // On the last step, Next is disabled.
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('goes back to a previous step', async () => {
    const onFetchKlines = defaultFetch();
    render(StepWizard, { props: { onFetchKlines } });
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalled());

    await fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument());
    await fireEvent.click(screen.getByRole('button', { name: /Previous/ }));
    await waitFor(() => expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument());
  });
});

describe('StepWizard — insight generation', () => {
  it('calls the insight callback for the active step with cascade context', async () => {
    const onFetchKlines = defaultFetch();
    const onGenerateInsightForTimeframe = vi.fn(async () => ({
      insight: makeNote({ title: 'Daily Macro Bias', mentor_tip: 'Respect the daily trend' }),
      analysis: {},
    }));

    render(StepWizard, { props: { onFetchKlines, onGenerateInsightForTimeframe } });
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalled());

    await fireEvent.click(screen.getByRole('button', { name: /Generate/ }));

    await waitFor(() => expect(onGenerateInsightForTimeframe).toHaveBeenCalledOnce());
    // First step has no previous insights -> empty cascade array.
    expect(onGenerateInsightForTimeframe).toHaveBeenCalledWith(
      '1D',
      expect.stringContaining('DAILY candles'),
      [],
      '1d',
      300
    );

    // Insight renders for the active step.
    await waitFor(() => expect(screen.getByText('Daily Macro Bias')).toBeInTheDocument());
    expect(screen.getByText('Respect the daily trend')).toBeInTheDocument();
    expect(screen.getByText('Bullish')).toHaveClass('ui-badge--success');
  });

  it('passes previously generated insights forward (matrioshka cascade)', async () => {
    const onFetchKlines = defaultFetch();
    const onGenerateInsightForTimeframe = vi.fn(
      async (
        label: string,
        _promptContext: string,
        _previousInsights: { label: string; insight: AdvisorNote }[],
        _interval: string,
        _limit: number
      ) => ({
        insight: makeNote({ title: `${label} insight` }),
        analysis: {},
      })
    );

    render(StepWizard, { props: { onFetchKlines, onGenerateInsightForTimeframe } });
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalled());

    // Generate on step 1 (1D).
    await fireEvent.click(screen.getByRole('button', { name: /Generate/ }));
    await waitFor(() => expect(onGenerateInsightForTimeframe).toHaveBeenCalledTimes(1));

    // Move to step 2 and generate again — previous 1D insight should be carried.
    await fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument());
    await fireEvent.click(screen.getByRole('button', { name: /Generate/ }));

    await waitFor(() => expect(onGenerateInsightForTimeframe).toHaveBeenCalledTimes(2));
    const secondCall = onGenerateInsightForTimeframe.mock.calls[1];
    expect(secondCall[0]).toBe('4H');
    // previousInsights argument carries the 1D step.
    expect(secondCall[2]).toEqual([
      { label: '1D', insight: expect.objectContaining({ title: '1D insight' }) },
    ]);
  });

  it('disables the Generate button when no insight callback is provided', async () => {
    const onFetchKlines = defaultFetch();
    render(StepWizard, { props: { onFetchKlines } });
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Generate/ })).toBeDisabled();
  });

  it('shows the placeholder prompt before any insight exists', async () => {
    const onFetchKlines = defaultFetch();
    render(StepWizard, { props: { onFetchKlines } });
    await tick();
    expect(screen.getByText(/Click "Generate" to get AI insight/)).toBeInTheDocument();
  });
});

describe('StepWizard — fetch failure resilience', () => {
  it('renders the no-data state when onFetchKlines rejects', async () => {
    const onFetchKlines = vi.fn(async () => {
      throw new Error('network down');
    });
    render(StepWizard, { props: { onFetchKlines } });
    await waitFor(() => expect(onFetchKlines).toHaveBeenCalled());
    await tick();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
