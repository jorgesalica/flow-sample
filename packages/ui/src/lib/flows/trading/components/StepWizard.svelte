<script lang="ts">
  import CandleChart from './CandleChart.svelte';
  import type { Candle, AdvisorNote } from '../trading';
  import type { WizardAnalysis, WizardInsightViewModel } from '../types';
  import { calculateWizardMetrics, formatCompactVolume, TRADING_WIZARD_STEPS } from '../wizard';
  import { clientLogger } from '@lib/client-logger';
  import { AsyncState, Badge, Button, Panel } from '@lib/components';

  type BadgeTone = 'danger' | 'neutral' | 'success';

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

  function getSentimentTone(bias: AdvisorNote['sentiment_bias']): BadgeTone {
    if (bias === 'LONG') return 'success';
    if (bias === 'SHORT') return 'danger';
    return 'neutral';
  }

  function getSentimentLabel(bias: AdvisorNote['sentiment_bias']): string {
    if (bias === 'LONG') return 'Bullish';
    if (bias === 'SHORT') return 'Bearish';
    return 'Neutral';
  }

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

<div class="wizard">
  <!-- Step Navigation -->
  <nav class="step-navigation" aria-label="Analysis timeframes">
    {#each TRADING_WIZARD_STEPS as step, index (step.id)}
      <Button
        size="sm"
        variant={index === currentStep ? 'primary' : index < currentStep ? 'secondary' : 'ghost'}
        class="wizard-step"
        onclick={() => goToStep(index)}
        aria-current={index === currentStep ? 'step' : undefined}
      >
        <span aria-hidden="true">{step.icon}</span>
        <span>{step.label}</span>
        {#if stepInsights[step.label]}
          <span class="step-complete" aria-hidden="true"></span>
        {/if}
      </Button>
    {/each}
  </nav>

  <!-- Current Step Info -->
  <div class="step-heading">
    <h3>
      {activeStep.icon} Step {activeStep.id}: {activeStep.focus}
    </h3>
    <p>Analyzing {activeStep.label} timeframe</p>
  </div>

  <!-- Chart Area -->
  <Panel padding="none" class="chart-panel">
    {#if isLoadingCandles}
      <div class="chart-state">
        <AsyncState state="loading" title="Loading candles" />
      </div>
    {:else}
      <CandleChart {candles} height={400} />
    {/if}
  </Panel>

  <!-- Step Info Panel -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Metrics -->
    <Panel padding="md">
      <h4 class="mb-3 text-sm font-semibold uppercase text-muted">
        📊 Metrics ({activeStep.label})
      </h4>
      {#if metrics}
        <div class="grid grid-cols-2 gap-3 text-sm">
          <!-- Fetched data -->
          <div
            class="col-span-2 mb-1 flex items-center gap-2 border-b border-border pb-2 text-xs text-muted"
          >
            <span class="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-semibold"
              >📡 Fetched</span
            >
            <span>{metrics.dateFrom} → {metrics.dateTo}</span>
          </div>
          <div>
            <span class="text-muted">Velas:</span>
            <span class="font-bold text-foreground">{metrics.candleCount}</span>
          </div>
          <div>
            <span class="text-muted">Intervalo:</span>
            <span class="font-bold text-cyan-400">{activeStep.interval}</span>
          </div>
          <div>
            <span class="text-muted">Último:</span>
            <span class="font-bold text-amber-400">
              ${metrics.last.toLocaleString()}
            </span>
          </div>
          <div>
            <span class="text-muted">Volumen Total:</span>
            <span class="font-bold text-foreground">{formatCompactVolume(metrics.totalVolume)}</span
            >
          </div>

          <!-- Calculated data -->
          <div
            class="col-span-2 mb-1 mt-2 flex items-center gap-2 border-b border-border pb-2 text-xs text-muted"
          >
            <span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold"
              >🔢 Calculated</span
            >
          </div>
          <div>
            <span class="text-muted">High:</span>
            <span class="font-bold text-green-400">
              ${metrics.high.toLocaleString()}
            </span>
          </div>
          <div>
            <span class="text-muted">Low:</span>
            <span class="font-bold text-red-400">
              ${metrics.low.toLocaleString()}
            </span>
          </div>
          <div>
            <span class="text-muted">Variación:</span>
            <span
              class="font-bold {metrics.priceChangePercent >= 0
                ? 'text-green-400'
                : 'text-red-400'}"
            >
              {metrics.priceChangePercent >= 0 ? '+' : ''}{metrics.priceChangePercent.toFixed(2)}%
            </span>
          </div>
          <div>
            <span class="text-muted">Volatilidad:</span>
            <span class="font-bold text-orange-400">{metrics.volatilityPercent.toFixed(2)}%</span>
          </div>
        </div>
      {:else}
        <AsyncState state="empty" title="No data available" />
      {/if}
    </Panel>

    <!-- Analysis Data (from backend computation) -->
    {#if stepAnalysis[activeStep.label]}
      {@const analysis = stepAnalysis[activeStep.label]}
      <Panel padding="md">
        <div class="flex items-center gap-2 mb-3">
          <h4 class="text-sm font-semibold uppercase text-muted">
            🖥️ Análisis Técnico ({activeStep.label})
          </h4>
          <Badge tone="success">Backend</Badge>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {#if analysis.regime_analysis}
            <div>
              <span class="text-muted">Régimen:</span>
              <span
                class="font-bold {analysis.regime_analysis.classification === 'TRENDING'
                  ? 'text-cyan-400'
                  : analysis.regime_analysis.classification === 'RANGING'
                    ? 'text-yellow-400'
                    : 'text-muted'}"
              >
                {analysis.regime_analysis.classification}
              </span>
            </div>
            <div>
              <span class="text-muted">Hurst:</span>
              <span class="font-bold text-foreground"
                >{analysis.regime_analysis.hurst_exponent}</span
              >
            </div>
            <div>
              <span class="text-muted">Dim. Fractal:</span>
              <span class="font-bold text-foreground"
                >{analysis.regime_analysis.fractal_dimension}</span
              >
            </div>
          {/if}
          {#if analysis.fractal_structure}
            <div>
              <span class="text-muted">Resistencia:</span>
              <span class="font-bold text-red-400">
                {typeof analysis.fractal_structure.nearest_resistance === 'number'
                  ? '$' + analysis.fractal_structure.nearest_resistance.toLocaleString()
                  : analysis.fractal_structure.nearest_resistance}
              </span>
              <span class="text-[10px] text-muted"
                >({analysis.fractal_structure.distance_to_resistance})</span
              >
            </div>
            <div>
              <span class="text-muted">Soporte:</span>
              <span class="font-bold text-green-400">
                {typeof analysis.fractal_structure.nearest_support === 'number'
                  ? '$' + analysis.fractal_structure.nearest_support.toLocaleString()
                  : analysis.fractal_structure.nearest_support}
              </span>
              <span class="text-[10px] text-muted"
                >({analysis.fractal_structure.distance_to_support})</span
              >
            </div>
            <div>
              <span class="text-muted">Toques S/R:</span>
              <span class="font-bold text-foreground">
                S:{analysis.fractal_structure.support_touch_count} / R:{analysis.fractal_structure
                  .resistance_touch_count}
              </span>
            </div>
          {/if}
          {#if analysis.indicators}
            {#if analysis.indicators.rsi && analysis.indicators.rsi !== 'N/A'}
              <div>
                <span class="text-muted">RSI:</span>
                <span
                  class="font-bold {parseFloat(analysis.indicators.rsi) > 70
                    ? 'text-red-400'
                    : parseFloat(analysis.indicators.rsi) < 30
                      ? 'text-green-400'
                      : 'text-foreground'}"
                >
                  {analysis.indicators.rsi}
                </span>
              </div>
            {/if}
            {#if analysis.indicators.macd}
              <div>
                <span class="text-muted">MACD:</span>
                <span
                  class="font-bold {parseFloat(analysis.indicators.macd.histogram) > 0
                    ? 'text-green-400'
                    : 'text-red-400'}"
                >
                  H: {analysis.indicators.macd.histogram}
                </span>
              </div>
              <div>
                <span class="text-muted">MACD Bias:</span>
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
              <span class="text-muted">Patrones:</span>
              <span class="font-bold text-amber-400">
                {Array.isArray(analysis.candle_patterns)
                  ? analysis.candle_patterns.join(', ')
                  : 'N/A'}
              </span>
            </div>
          {/if}
        </div>
      </Panel>
    {/if}

    <!-- Insight for this step -->
    <Panel padding="md">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-semibold uppercase text-muted">
          🧠 {activeStep.label} Insight
        </h4>
        <Button
          size="sm"
          variant="secondary"
          onclick={generateInsightForCurrentStep}
          disabled={isLoadingInsight || !onGenerateInsightForTimeframe}
          loading={isLoadingInsight}
        >
          Generate
        </Button>
      </div>

      {#if currentInsight}
        <div class="space-y-2">
          <p class="text-sm font-semibold text-amber-400">{currentInsight.title}</p>
          <p class="text-sm text-foreground">{currentInsight.mentor_tip}</p>
          {#if currentInsight.sentiment_bias}
            <Badge tone={getSentimentTone(currentInsight.sentiment_bias)}>
              {getSentimentLabel(currentInsight.sentiment_bias)}
            </Badge>
          {/if}
        </div>
      {:else}
        <p class="text-sm text-muted">
          Click "Generate" to get AI insight for {activeStep.label} timeframe
        </p>
      {/if}
    </Panel>
  </div>

  <!-- Navigation Buttons -->
  <div class="step-actions">
    <Button variant="secondary" onclick={goPrev} disabled={!canGoPrev}>Previous</Button>

    <span class="text-sm text-muted">
      Step {currentStep + 1} of {TRADING_WIZARD_STEPS.length}
    </span>

    <Button onclick={goNext} disabled={!canGoNext}>Next</Button>
  </div>
</div>

<style>
  .wizard {
    display: grid;
    min-width: 0;
    gap: 1.25rem;
  }

  .step-navigation {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  .step-navigation :global(.wizard-step) {
    position: relative;
    gap: 0.5rem;
  }

  .step-complete {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--ui-success);
  }

  .step-heading {
    text-align: center;
  }

  .step-heading h3 {
    margin: 0;
    color: var(--ui-focus);
    font-size: 1.125rem;
    letter-spacing: 0;
  }

  .step-heading p {
    margin: 0.25rem 0 0;
    color: var(--ui-text-muted);
    font-size: 0.875rem;
  }

  .wizard :global(.chart-panel) {
    min-height: 25rem;
    overflow: hidden;
  }

  .chart-state {
    display: grid;
    min-height: 25rem;
    place-items: center;
  }

  .step-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 1rem;
  }

  .step-actions :global(.ui-button:first-child) {
    justify-self: start;
  }

  .step-actions :global(.ui-button:last-child) {
    justify-self: end;
  }

  @media (max-width: 35rem) {
    .step-navigation :global(.wizard-step) {
      flex: 1 1 calc(50% - 0.5rem);
    }

    .step-actions {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .step-actions > span {
      grid-column: 1 / -1;
      grid-row: 1;
      justify-self: center;
    }

    .step-actions :global(.ui-button) {
      grid-row: 2;
      width: 100%;
    }
  }
</style>
