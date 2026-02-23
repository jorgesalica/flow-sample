<script lang="ts">
  import CandleChart from './CandleChart.svelte';
  import type { Candle, AdvisorNote } from '../flows/trading';

  interface TimeframeStep {
    id: number;
    label: string;
    interval: string;
    focus: string;
    icon: string;
    candleLimit: number;
    promptContext: string;
  }

  const STEPS: TimeframeStep[] = [
    {
      id: 1,
      label: '1D',
      interval: '1d', // Daily candles over ~1 month
      focus: 'Daily Candles',
      icon: '🌍',
      candleLimit: 30, // 30 days = 30 daily candles
      promptContext:
        'Analyze the last MONTH of price action using DAILY candles to determine the overall market bias. Is this a trending or ranging market? What is the dominant direction? Identify key support/resistance zones visible at this macro scale.',
    },
    {
      id: 2,
      label: '4H',
      interval: '4h', // 4-hour candles over ~1 month
      focus: '4-Hour Candles',
      icon: '🏗️',
      candleLimit: 180, // 30 days × 6 candles/day = 180
      promptContext:
        'Analyze the last MONTH using 4-HOUR candles to identify key structural levels. Where are the major support and resistance zones? Are there any structural shifts (higher highs/lows or lower highs/lows)?',
    },
    {
      id: 3,
      label: '1H',
      interval: '1h', // Hourly candles over ~1 month
      focus: 'Hourly Candles',
      icon: '🎯',
      candleLimit: 720, // 30 days × 24 candles/day = 720
      promptContext:
        'Analyze the last MONTH using HOURLY candles to look for trade setups. Are there any candlestick patterns forming? Is price approaching a key level where a reaction is likely? What is the short-term trend direction?',
    },
    {
      id: 4,
      label: '15m',
      interval: '15m', // 15-minute candles (~10 days due to Binance 1000 limit)
      focus: '15-Min Candles',
      icon: '⚡',
      candleLimit: 1000, // 30 days × 96/day = 2880, capped at 1000 (~10 days)
      promptContext:
        'Analyze the most recent price action using 15-MINUTE candles for entry timing. What is the immediate price action? Where would be the optimal entry point and stop loss? Look for micro-patterns and momentum signals.',
    },
  ];

  interface Props {
    onFetchKlines: (interval: string, limit: number) => Promise<Candle[]>;
    onGenerateInsightForTimeframe?: (
      stepLabel: string,
      promptContext: string,
      previousInsights: { label: string; insight: AdvisorNote }[]
    ) => Promise<AdvisorNote | null>;
  }

  let { onFetchKlines, onGenerateInsightForTimeframe }: Props = $props();

  let currentStep = $state(0);
  let candles: Candle[] = $state([]);
  let isLoadingCandles = $state(false);
  let isLoadingInsight = $state(false);

  // Per-step insights storage
  let stepInsights: Record<string, AdvisorNote | null> = $state({});

  const activeStep = $derived(STEPS[currentStep]);
  const canGoNext = $derived(currentStep < STEPS.length - 1);
  const canGoPrev = $derived(currentStep > 0);
  const currentInsight = $derived(stepInsights[activeStep.label] || null);

  async function loadStepData() {
    isLoadingCandles = true;
    try {
      candles = await onFetchKlines(activeStep.interval, activeStep.candleLimit);
    } catch (error) {
      console.error('Failed to fetch klines:', error);
      candles = [];
    } finally {
      isLoadingCandles = false;
    }
  }

  async function generateInsightForCurrentStep() {
    if (!onGenerateInsightForTimeframe) return;

    isLoadingInsight = true;
    try {
      // MATRIOSHKA: Collect insights from all previous steps
      const previousInsights: { label: string; insight: AdvisorNote }[] = [];
      for (let i = 0; i < currentStep; i++) {
        const step = STEPS[i];
        const insight = stepInsights[step.label];
        if (insight) {
          previousInsights.push({ label: step.label, insight });
        }
      }

      console.log(
        `[Wizard Matrioshka] Step ${activeStep.label} has ${previousInsights.length} previous insights`
      );

      const insight = await onGenerateInsightForTimeframe(
        activeStep.label,
        activeStep.promptContext,
        previousInsights
      );
      if (insight) {
        stepInsights[activeStep.label] = insight;
      }
    } catch (error) {
      console.error('Failed to generate insight:', error);
    } finally {
      isLoadingInsight = false;
    }
  }

  async function goNext() {
    if (canGoNext) {
      currentStep++;
      await loadStepData();
    }
  }

  async function goPrev() {
    if (canGoPrev) {
      currentStep--;
      await loadStepData();
    }
  }

  async function goToStep(stepIndex: number) {
    if (stepIndex >= 0 && stepIndex < STEPS.length) {
      currentStep = stepIndex;
      await loadStepData();
    }
  }

  // Load first step on mount
  $effect(() => {
    loadStepData();
  });
</script>

<div class="space-y-6">
  <!-- Step Navigation -->
  <div class="flex items-center justify-center gap-2 flex-wrap">
    {#each STEPS as step, index (step.id)}
      <button
        onclick={() => goToStep(index)}
        class="relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300
          {index === currentStep
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-lg shadow-amber-500/20'
          : index < currentStep
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}"
      >
        <span class="text-lg">{step.icon}</span>
        <span class="font-semibold">{step.label}</span>
        {#if stepInsights[step.label]}
          <span class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></span>
        {/if}
      </button>
      {#if index < STEPS.length - 1}
        <span class="text-white/20 hidden md:inline">→</span>
      {/if}
    {/each}
  </div>

  <!-- Current Step Info -->
  <div class="text-center">
    <h3 class="text-xl font-bold text-amber-400">
      {activeStep.icon} Step {activeStep.id}: {activeStep.focus}
    </h3>
    <p class="text-white/40 text-sm">
      Analyzing {activeStep.label} timeframe
    </p>
  </div>

  <!-- Chart Area -->
  <div class="glass p-4 rounded-xl">
    {#if isLoadingCandles}
      <div class="flex items-center justify-center h-[400px]">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"
        ></div>
      </div>
    {:else}
      <CandleChart {candles} height={400} />
    {/if}
  </div>

  <!-- Step Info Panel -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Metrics -->
    <div class="glass p-4 rounded-xl">
      <h4 class="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">
        📊 Metrics ({activeStep.label})
      </h4>
      {#if candles.length > 0}
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-white/50">Candles:</span>
            <span class="font-bold text-white">{candles.length}</span>
          </div>
          <div>
            <span class="text-white/50">Latest:</span>
            <span class="font-bold text-amber-400">
              ${candles[candles.length - 1]?.close.toLocaleString() || '—'}
            </span>
          </div>
          <div>
            <span class="text-white/50">High:</span>
            <span class="font-bold text-green-400">
              ${Math.max(...candles.map((c) => c.high)).toLocaleString()}
            </span>
          </div>
          <div>
            <span class="text-white/50">Low:</span>
            <span class="font-bold text-red-400">
              ${Math.min(...candles.map((c) => c.low)).toLocaleString()}
            </span>
          </div>
        </div>
      {:else}
        <p class="text-white/30">No data available</p>
      {/if}
    </div>

    <!-- Insight for this step -->
    <div class="glass p-4 rounded-xl">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-semibold text-white/40 uppercase tracking-wider">
          🧠 {activeStep.label} Insight
        </h4>
        <button
          onclick={generateInsightForCurrentStep}
          disabled={isLoadingInsight || !onGenerateInsightForTimeframe}
          class="px-3 py-1 text-xs rounded-lg transition-all
            {isLoadingInsight
            ? 'bg-white/10 text-white/40 cursor-wait'
            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50'}"
        >
          {isLoadingInsight ? '⏳ Generating...' : '✨ Generate'}
        </button>
      </div>

      {#if currentInsight}
        <div class="space-y-2">
          <p class="text-sm font-semibold text-amber-400">{currentInsight.title}</p>
          <p class="text-sm text-white/80">{currentInsight.mentor_tip}</p>
          {#if currentInsight.sentiment_bias}
            <span
              class="inline-block px-2 py-1 rounded text-xs font-bold
                {currentInsight.sentiment_bias === 'LONG'
                ? 'bg-green-500/20 text-green-400'
                : currentInsight.sentiment_bias === 'SHORT'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-500/20 text-gray-400'}"
            >
              {currentInsight.sentiment_bias === 'LONG'
                ? '🐂 BULLISH'
                : currentInsight.sentiment_bias === 'SHORT'
                  ? '🐻 BEARISH'
                  : '⚖️ NEUTRAL'}
            </span>
          {/if}
        </div>
      {:else}
        <p class="text-white/30 text-sm">
          Click "Generate" to get AI insight for {activeStep.label} timeframe
        </p>
      {/if}
    </div>
  </div>

  <!-- Navigation Buttons -->
  <div class="flex items-center justify-between">
    <button
      onclick={goPrev}
      disabled={!canGoPrev}
      class="px-6 py-2 rounded-lg flex items-center gap-2 transition-all
        {canGoPrev
        ? 'bg-white/10 text-white hover:bg-white/20'
        : 'bg-white/5 text-white/20 cursor-not-allowed'}"
    >
      ← Previous
    </button>

    <span class="text-white/40 text-sm">
      Step {currentStep + 1} of {STEPS.length}
    </span>

    <button
      onclick={goNext}
      disabled={!canGoNext}
      class="px-6 py-2 rounded-lg flex items-center gap-2 transition-all
        {canGoNext
        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50'
        : 'bg-white/5 text-white/20 cursor-not-allowed'}"
    >
      Next →
    </button>
  </div>
</div>
