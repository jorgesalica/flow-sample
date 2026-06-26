// Trading Flow State (runes)
//
// Runes-based replacement for the former `stores.ts` (svelte/store writables).
// State lives in `$state` fields on a single class instance exported as
// `tradingStore`. Consumers read reactive values via the getters
// (`tradingStore.tradingState`, `tradingStore.candles`, …) and mutate through
// the action methods, mirroring the old stores' public surface. The
// rolling-window append used by the SSE handler is preserved in
// `appendClosedCandle`.
import type { Candle, FractalNode, AdvisorNote, TradingState, AdvisorState } from '@flows/shared';

function initialTradingState(): TradingState {
  return {
    isRunning: false,
    symbol: 'BTCUSDT',
    interval: '1m',
    lastCandle: null,
    candleCount: 0,
    connectedAt: null,
  };
}

function initialAdvisorState(): AdvisorState {
  return {
    isEnabled: false,
    lastInsightAt: null,
    insightCount: 0,
  };
}

class TradingStore {
  #tradingState = $state<TradingState>(initialTradingState());
  #advisorState = $state<AdvisorState>(initialAdvisorState());
  #candles = $state<Candle[]>([]);
  #fractals = $state<FractalNode[]>([]);
  #latestInsight = $state<AdvisorNote | null>(null);
  #isLoadingInsight = $state(false);

  // ── reads ──────────────────────────────────────────────────────────
  get tradingState(): TradingState {
    return this.#tradingState;
  }

  get advisorState(): AdvisorState {
    return this.#advisorState;
  }

  get candles(): Candle[] {
    return this.#candles;
  }

  get fractals(): FractalNode[] {
    return this.#fractals;
  }

  get latestInsight(): AdvisorNote | null {
    return this.#latestInsight;
  }

  get isLoadingInsight(): boolean {
    return this.#isLoadingInsight;
  }

  // ── trading state ──────────────────────────────────────────────────
  setTradingState(state: TradingState): void {
    this.#tradingState = state;
  }

  updateTradingState(updater: (state: TradingState) => TradingState): void {
    this.#tradingState = updater(this.#tradingState);
  }

  // ── advisor state ──────────────────────────────────────────────────
  setAdvisorState(state: AdvisorState): void {
    this.#advisorState = state;
  }

  updateAdvisorState(updater: (state: AdvisorState) => AdvisorState): void {
    this.#advisorState = updater(this.#advisorState);
  }

  // ── candles ────────────────────────────────────────────────────────
  setCandles(list: Candle[]): void {
    this.#candles = list;
  }

  /**
   * Rolling-window append used by the SSE `candleClosed` handler: keep the most
   * recent 100 candles (the previous 99 plus the newly closed one).
   */
  appendClosedCandle(candle: Candle): void {
    this.#candles = [...this.#candles.slice(-99), candle];
  }

  // ── fractals ───────────────────────────────────────────────────────
  setFractals(list: FractalNode[]): void {
    this.#fractals = list;
  }

  // ── latest insight ─────────────────────────────────────────────────
  setLatestInsight(insight: AdvisorNote | null): void {
    this.#latestInsight = insight;
  }

  // ── insight loading flag ───────────────────────────────────────────
  setLoadingInsight(loading: boolean): void {
    this.#isLoadingInsight = loading;
  }

  /** Reset every field to its baseline — used to isolate tests. */
  reset(): void {
    this.#tradingState = initialTradingState();
    this.#advisorState = initialAdvisorState();
    this.#candles = [];
    this.#fractals = [];
    this.#latestInsight = null;
    this.#isLoadingInsight = false;
  }
}

export const tradingStore = new TradingStore();
