<script lang="ts">
  import CandleChart from './CandleChart.svelte';
  import type { Candle, AdvisorNote } from '../trading';
  import type { WizardAnalysis, WizardInsightViewModel } from '../types';
  import { calculateWizardMetrics, formatCompactVolume, TRADING_WIZARD_STEPS } from '../wizard';
  import { clientLogger } from '@lib/client-logger';

  interface Props {
    onFetchKlines: (interval: string, limit: number) => Promise<Candle[]>;
    onGenerateInsightForTimeframe?: (
      stepLabel: string,
      promptContext: string,
      previousInsights: { label: string; insight: AdvisorNote }[],
      interval: string,
      limit: number
    ) => Promise<WizardInsightViewModel | null>;
  }

  let { onFetchKlines, onGenerateInsightForTimeframe }: Props = $props();

  let currentStep = $state(0);
  let candles: Candle[] = $state([]);
  let isLoadingCandles = $state(false);
  let isLoadingInsight = $state(false);

  // Per-step insights storage
  let stepInsights: Record<string, AdvisorNote | null> = $state({});
  // Per-step analysis data (from backend computation)
  let stepAnalysis: Record<string, WizardAnalysis> = $state({});

  const activeStep = $derived(TRADING_WIZARD_STEPS[currentStep]);
  const canGoNext = $derived(currentStep < TRADING_WIZARD_STEPS.length - 1);
  const canGoPrev = $derived(currentStep > 0);
  const currentInsight = $derived(stepInsights[activeStep.label] || null);
  const metrics = $derived(calculateWizardMetrics(candles));

  async function loadStepData() {
    isLoadingCandles = true;
    try {
      candles = await onFetchKlines(activeStep.interval, activeStep.candleLimit);
    } catch (error) {
      clientLogger.error('Trading wizard failed to fetch klines', { error });
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
        const step = TRADING_WIZARD_STEPS[i];
        const insight = stepInsights[step.label];
        if (insight) {
          previousInsights.push({ label: step.label, insight });
        }
      }

      clientLogger.debug('Trading wizard assembled cascade context', {
        step: activeStep.label,
        previousInsightCount: previousInsights.length,
      });

      const result = await onGenerateInsightForTimeframe(
        activeStep.label,
        activeStep.promptContext,
        previousInsights,
        activeStep.interval,
        activeStep.candleLimit
      );
      if (result) {
        stepInsights[activeStep.label] = result.insight;
        stepAnalysis[activeStep.label] = result.analysis;
      }
    } catch (error) {
      clientLogger.error('Trading wizard failed to generate insight', { error });
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
    if (stepIndex >= 0 && stepIndex < TRADING_WIZARD_STEPS.length) {
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
    {#each TRADING_WIZARD_STEPS as step, index (step.id)}
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
      {#if index < TRADING_WIZARD_STEPS.length - 1}
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
      {#if metrics}
        <div class="grid grid-cols-2 gap-3 text-sm">
          <!-- Fetched data -->
          <div
            class="col-span-2 flex items-center gap-2 text-xs text-white/30 border-b border-white/10 pb-2 mb-1"
          >
            <span class="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-semibold"
              >📡 Fetched</span
            >
            <span>{metrics.dateFrom} → {metrics.dateTo}</span>
          </div>
          <div>
            <span class="text-white/50">Velas:</span>
            <span class="font-bold text-white">{metrics.candleCount}</span>
          </div>
          <div>
            <span class="text-white/50">Intervalo:</span>
            <span class="font-bold text-cyan-400">{activeStep.interval}</span>
          </div>
          <div>
            <span class="text-white/50">Último:</span>
            <span class="font-bold text-amber-400">
              ${metrics.last.toLocaleString()}
            </span>
          </div>
          <div>
            <span class="text-white/50">Volumen Total:</span>
            <span class="font-bold text-white">{formatCompactVolume(metrics.totalVolume)}</span>
          </div>

          <!-- Calculated data -->
          <div
            class="col-span-2 flex items-center gap-2 text-xs text-white/30 border-b border-white/10 pb-2 mb-1 mt-2"
          >
            <span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold"
              >🔢 Calculated</span
            >
          </div>
          <div>
            <span class="text-white/50">High:</span>
            <span class="font-bold text-green-400">
              ${metrics.high.toLocaleString()}
            </span>
          </div>
          <div>
            <span class="text-white/50">Low:</span>
            <span class="font-bold text-red-400">
              ${metrics.low.toLocaleString()}
            </span>
          </div>
          <div>
            <span class="text-white/50">Variación:</span>
            <span
              class="font-bold {metrics.priceChangePercent >= 0
                ? 'text-green-400'
                : 'text-red-400'}"
            >
              {metrics.priceChangePercent >= 0 ? '+' : ''}{metrics.priceChangePercent.toFixed(2)}%
            </span>
          </div>
          <div>
            <span class="text-white/50">Volatilidad:</span>
            <span class="font-bold text-orange-400">{metrics.volatilityPercent.toFixed(2)}%</span>
          </div>
        </div>
      {:else}
        <p class="text-white/30">No data available</p>
      {/if}
    </div>

    <!-- Analysis Data (from backend computation) -->
    {#if stepAnalysis[activeStep.label]}
      {@const analysis = stepAnalysis[activeStep.label]}
      <div class="glass p-4 rounded-xl">
        <div class="flex items-center gap-2 mb-3">
          <h4 class="text-sm font-semibold text-white/40 uppercase tracking-wider">
            🖥️ Análisis Técnico ({activeStep.label})
          </h4>
          <span
            class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold"
            >Backend</span
          >
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {#if analysis.regime_analysis}
            <div>
              <span class="text-white/50">Régimen:</span>
              <span
                class="font-bold {analysis.regime_analysis.classification === 'TRENDING'
                  ? 'text-cyan-400'
                  : analysis.regime_analysis.classification === 'RANGING'
                    ? 'text-yellow-400'
                    : 'text-white/60'}"
              >
                {analysis.regime_analysis.classification}
              </span>
            </div>
            <div>
              <span class="text-white/50">Hurst:</span>
              <span class="font-bold text-white">{analysis.regime_analysis.hurst_exponent}</span>
            </div>
            <div>
              <span class="text-white/50">Dim. Fractal:</span>
              <span class="font-bold text-white">{analysis.regime_analysis.fractal_dimension}</span>
            </div>
          {/if}
          {#if analysis.fractal_structure}
            <div>
              <span class="text-white/50">Resistencia:</span>
              <span class="font-bold text-red-400">
                {typeof analysis.fractal_structure.nearest_resistance === 'number'
                  ? '$' + analysis.fractal_structure.nearest_resistance.toLocaleString()
                  : analysis.fractal_structure.nearest_resistance}
              </span>
              <span class="text-[10px] text-white/30"
                >({analysis.fractal_structure.distance_to_resistance})</span
              >
            </div>
            <div>
              <span class="text-white/50">Soporte:</span>
              <span class="font-bold text-green-400">
                {typeof analysis.fractal_structure.nearest_support === 'number'
                  ? '$' + analysis.fractal_structure.nearest_support.toLocaleString()
                  : analysis.fractal_structure.nearest_support}
              </span>
              <span class="text-[10px] text-white/30"
                >({analysis.fractal_structure.distance_to_support})</span
              >
            </div>
            <div>
              <span class="text-white/50">Toques S/R:</span>
              <span class="font-bold text-white">
                S:{analysis.fractal_structure.support_touch_count} / R:{analysis.fractal_structure
                  .resistance_touch_count}
              </span>
            </div>
          {/if}
          {#if analysis.indicators}
            {#if analysis.indicators.rsi && analysis.indicators.rsi !== 'N/A'}
              <div>
                <span class="text-white/50">RSI:</span>
                <span
                  class="font-bold {parseFloat(analysis.indicators.rsi) > 70
                    ? 'text-red-400'
                    : parseFloat(analysis.indicators.rsi) < 30
                      ? 'text-green-400'
                      : 'text-white'}"
                >
                  {analysis.indicators.rsi}
                </span>
              </div>
            {/if}
            {#if analysis.indicators.macd}
              <div>
                <span class="text-white/50">MACD:</span>
                <span
                  class="font-bold {parseFloat(analysis.indicators.macd.histogram) > 0
                    ? 'text-green-400'
                    : 'text-red-400'}"
                >
                  H: {analysis.indicators.macd.histogram}
                </span>
              </div>
              <div>
                <span class="text-white/50">MACD Bias:</span>
                <span
                  class="font-bold {analysis.indicators.macd.bias === 'Bullish'
                    ? 'text-green-400'
                    : 'text-red-400'}"
                >
                  {analysis.indicators.macd.bias}
                </span>
              </div>
            {/if}
          {/if}
          {#if analysis.candle_patterns}
            <div class="col-span-2 md:col-span-3">
              <span class="text-white/50">Patrones:</span>
              <span class="font-bold text-amber-400">
                {Array.isArray(analysis.candle_patterns)
                  ? analysis.candle_patterns.join(', ')
                  : 'N/A'}
              </span>
            </div>
          {/if}
        </div>
      </div>
    {/if}

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
      Step {currentStep + 1} of {TRADING_WIZARD_STEPS.length}
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
