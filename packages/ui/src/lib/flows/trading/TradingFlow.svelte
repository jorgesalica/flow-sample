<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { AsyncState, Badge, Button, FlowLayout, Panel } from '@lib/components';
  import StepWizard from './components/StepWizard.svelte';
  import {
    connectToStream,
    disconnectFromStream,
    fetchKlines,
    generateInsight,
    generateWizardInsight,
    startTrading,
    stopTrading,
    toggleAdvisor,
    tradingStore,
    type AdvisorNote,
    type TradingPageData,
  } from './trading';

  type BadgeTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';

  interface EnhancedAdvisorNote extends AdvisorNote {
    _debugContext?: unknown;
  }

  let { initialData }: { initialData: TradingPageData } = $props();

  let tradingData = $derived(tradingStore.tradingState);
  let advisor = $derived(tradingStore.advisorState);
  let insight = $derived(tradingStore.latestInsight) as EnhancedAdvisorNote | null;
  let candleList = $derived(tradingStore.candles);
  let loadingInsight = $derived(tradingStore.isLoadingInsight);
  let viewMode: 'dashboard' | 'wizard' = $state('dashboard');

  function formatPrice(price: number | undefined): string {
    if (price === undefined) return 'N/A';
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatTime(timestamp: number | string | null): string {
    if (timestamp === null) return 'N/A';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

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

  function getCandleChange(open: number, close: number): number {
    if (open === 0) return 0;
    return ((close - open) / open) * 100;
  }

  onMount(() => {
    if (initialData.trading) tradingStore.setTradingState(initialData.trading);
    if (initialData.advisor) tradingStore.setAdvisorState(initialData.advisor);
    tradingStore.setCandles(initialData.candles);
    tradingStore.setLatestInsight(initialData.insight);
    connectToStream();
  });

  onDestroy(() => {
    disconnectFromStream();
  });
</script>

<FlowLayout>
  <div class="trading-flow">
    <header class="page-header">
      <div>
        <h1>Trading Bot</h1>
        <p>{tradingData.symbol} / {tradingData.interval.toUpperCase()}</p>
      </div>
      <Badge tone={tradingData.isRunning ? 'success' : 'neutral'}>
        {tradingData.isRunning ? 'Stream connected' : 'Stream disconnected'}
      </Badge>
    </header>

    <dl class="status-grid" aria-label="Market status">
      <Panel padding="sm">
        <div class="status-item">
          <dt>Stream</dt>
          <dd>{tradingData.isRunning ? 'Connected' : 'Disconnected'}</dd>
        </div>
      </Panel>
      <Panel padding="sm">
        <div class="status-item">
          <dt>{tradingData.symbol}</dt>
          <dd class="accent">${formatPrice(tradingData.lastCandle?.close)}</dd>
        </div>
      </Panel>
      <Panel padding="sm">
        <div class="status-item">
          <dt>Candles</dt>
          <dd>{tradingData.candleCount.toLocaleString()}</dd>
        </div>
      </Panel>
      <Panel padding="sm">
        <div class="status-item">
          <dt>Last update</dt>
          <dd>{formatTime(tradingData.lastCandle?.closeTime ?? null)}</dd>
        </div>
      </Panel>
    </dl>

    <Panel element="section" ariaLabel="Trading controls">
      <div class="panel-heading">
        <h2>Controls</h2>
      </div>
      <div class="control-list">
        {#if tradingData.isRunning}
          <Button variant="danger" onclick={stopTrading}>Stop stream</Button>
        {:else}
          <Button onclick={startTrading}>Start stream</Button>
        {/if}
        <Button variant={advisor.isEnabled ? 'primary' : 'secondary'} onclick={toggleAdvisor}>
          Advisor {advisor.isEnabled ? 'on' : 'off'}
        </Button>
        <Button onclick={generateInsight} loading={loadingInsight}>Generate insight</Button>
        <Button
          variant={viewMode === 'wizard' ? 'primary' : 'secondary'}
          onclick={() => (viewMode = viewMode === 'dashboard' ? 'wizard' : 'dashboard')}
        >
          {viewMode === 'wizard' ? 'Wizard mode' : 'Open wizard'}
        </Button>
      </div>
    </Panel>

    {#if viewMode === 'wizard'}
      <section class="wizard-view" aria-labelledby="wizard-title">
        <header class="mode-header">
          <div>
            <h2 id="wizard-title">Cascade analysis wizard</h2>
            <p>Multi-timeframe market analysis</p>
          </div>
          <Button variant="ghost" size="sm" onclick={() => (viewMode = 'dashboard')}>
            Back to dashboard
          </Button>
        </header>
        <StepWizard
          onFetchKlines={fetchKlines}
          onGenerateInsightForTimeframe={async (
            stepLabel,
            promptContext,
            previousInsights,
            interval,
            limit
          ) => {
            const result = await generateWizardInsight({
              interval,
              limit,
              stepLabel,
              promptContext,
              previousInsights,
            });

            if (result) return { insight: result.insight, analysis: result.analysis };
            return null;
          }}
        />
      </section>
    {:else}
      <div class="dashboard-grid">
        <Panel element="section" ariaLabel="Live candles">
          <div class="panel-heading">
            <div>
              <h2>Live candles</h2>
              <p>Latest {tradingData.interval} market updates</p>
            </div>
            <Badge tone="info">{candleList.length} loaded</Badge>
          </div>

          {#if candleList.length > 0}
            <ul class="candle-list" aria-label="Recent candles">
              {#each candleList.slice(-20).reverse() as candle (candle.openTime)}
                {@const change = getCandleChange(candle.open, candle.close)}
                <li class="candle-row">
                  <time datetime={new Date(candle.openTime).toISOString()}>
                    {formatTime(candle.openTime)}
                  </time>
                  <strong>${formatPrice(candle.close)}</strong>
                  <span class:positive={change > 0} class:negative={change < 0}>
                    {change > 0 ? '+' : ''}{change.toFixed(3)}%
                  </span>
                </li>
              {/each}
            </ul>
          {:else}
            <AsyncState
              state="empty"
              title="No candles yet"
              message="Start the stream to collect market data."
            />
          {/if}
        </Panel>

        <Panel element="section" ariaLabel="Advisor insight">
          <div class="panel-heading">
            <div>
              <h2>Advisor insight</h2>
              <p>Current market interpretation</p>
            </div>
            {#if insight?.sentiment_bias}
              <Badge tone={getSentimentTone(insight.sentiment_bias)}>
                {getSentimentLabel(insight.sentiment_bias)}
              </Badge>
            {/if}
          </div>

          {#if insight}
            <div class="insight-content">
              <h3>{insight.title}</h3>

              {#if insight.regime_context}
                <section class="insight-block" aria-labelledby="regime-heading">
                  <h4 id="regime-heading">Regime context</h4>
                  <p>{insight.regime_context}</p>
                </section>
              {/if}

              {#if insight.scenario_bullish}
                <section class="insight-block positive-block" aria-labelledby="bullish-heading">
                  <h4 id="bullish-heading">Bullish scenario</h4>
                  <p>{insight.scenario_bullish}</p>
                </section>
              {/if}

              {#if insight.scenario_bearish}
                <section class="insight-block negative-block" aria-labelledby="bearish-heading">
                  <h4 id="bearish-heading">Bearish scenario</h4>
                  <p>{insight.scenario_bearish}</p>
                </section>
              {/if}

              {#if insight.risk_management}
                <section class="insight-block warning-block" aria-labelledby="risk-heading">
                  <h4 id="risk-heading">Risk management</h4>
                  <dl class="risk-grid">
                    <div>
                      <dt>Stop loss</dt>
                      <dd>${formatPrice(insight.risk_management.recommended_sl)}</dd>
                    </div>
                    <div>
                      <dt>Invalidation</dt>
                      <dd>{insight.risk_management.invalidation_reason}</dd>
                    </div>
                  </dl>
                </section>
              {/if}

              {#if insight.mentor_tip}
                <section class="insight-block info-block" aria-labelledby="mentor-heading">
                  <h4 id="mentor-heading">Mentor tip</h4>
                  <p>{insight.mentor_tip}</p>
                </section>
              {/if}

              {#if insight.reasoning_key_factors && insight.reasoning_key_factors.length > 0}
                <section class="insight-block info-block" aria-labelledby="logic-heading">
                  <div class="insight-block-heading">
                    <h4 id="logic-heading">Logic trace</h4>
                    {#if insight.confidence_score !== undefined}
                      <Badge tone="info">Confidence: {insight.confidence_score}%</Badge>
                    {/if}
                  </div>
                  <ul class="factor-list">
                    {#each insight.reasoning_key_factors as factor (factor)}
                      <li>{factor}</li>
                    {/each}
                  </ul>
                </section>
              {/if}

              {#if insight._debugContext}
                <details class="debug-details">
                  <summary>Show analysis context</summary>
                  <pre>{JSON.stringify(insight._debugContext, null, 2)}</pre>
                </details>
              {/if}
            </div>
          {:else}
            <AsyncState
              state="empty"
              title="No insight available"
              message="Collect market data, then generate an insight."
            />
          {/if}
        </Panel>
      </div>
    {/if}
  </div>
</FlowLayout>

<style>
  .trading-flow {
    display: grid;
    min-width: 0;
    gap: 1rem;
    color: var(--ui-text);
  }

  .page-header,
  .mode-header,
  .panel-heading,
  .insight-block-heading {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .page-header h1,
  .mode-header h2,
  .panel-heading h2,
  .insight-content h3,
  .insight-block h4 {
    margin: 0;
    letter-spacing: 0;
  }

  .page-header h1 {
    font-size: 2.25rem;
    line-height: 1.1;
  }

  .page-header p,
  .mode-header p,
  .panel-heading p {
    margin: 0.25rem 0 0;
    color: var(--ui-text-muted);
    font-size: 0.875rem;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 0;
  }

  .status-item {
    display: grid;
    gap: 0.375rem;
  }

  .status-item dt,
  .risk-grid dt {
    color: var(--ui-text-muted);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .status-item dd,
  .risk-grid dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .status-item dd {
    font-weight: 700;
  }

  .status-item .accent,
  .candle-row strong {
    color: var(--ui-focus);
  }

  .panel-heading {
    margin-bottom: 1rem;
  }

  .panel-heading h2,
  .mode-header h2 {
    font-size: 1.125rem;
  }

  .control-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .wizard-view {
    display: grid;
    min-width: 0;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .candle-list {
    display: grid;
    max-height: 24rem;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  .candle-row {
    display: grid;
    grid-template-columns: minmax(6rem, 1fr) minmax(6rem, 1fr) minmax(5rem, auto);
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0;
    border-bottom: 1px solid var(--ui-border);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.75rem;
  }

  .candle-row time {
    color: var(--ui-text-muted);
  }

  .candle-row span {
    justify-self: end;
    font-weight: 700;
  }

  .positive {
    color: #4ade80;
  }

  .negative {
    color: var(--ui-danger);
  }

  .insight-content {
    display: grid;
    max-height: 30rem;
    gap: 1rem;
    overflow-y: auto;
  }

  .insight-content h3 {
    color: var(--ui-focus);
    font-size: 1.125rem;
  }

  .insight-block {
    padding-left: 0.875rem;
    border-left: 3px solid var(--ui-border);
  }

  .insight-block h4 {
    color: var(--ui-text-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .insight-block p {
    margin: 0.375rem 0 0;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .positive-block {
    border-left-color: #4ade80;
  }

  .negative-block {
    border-left-color: var(--ui-danger);
  }

  .warning-block {
    border-left-color: #facc15;
  }

  .info-block {
    border-left-color: var(--ui-focus);
  }

  .risk-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: 1rem;
    margin: 0.75rem 0 0;
  }

  .risk-grid > div {
    display: grid;
    gap: 0.25rem;
  }

  .factor-list {
    margin: 0.5rem 0 0;
    padding-left: 1.25rem;
    color: var(--ui-text-muted);
    font-size: 0.875rem;
  }

  .debug-details summary {
    cursor: pointer;
    color: var(--ui-text-muted);
    font-size: 0.75rem;
  }

  .debug-details pre {
    max-height: 15rem;
    margin: 0.5rem 0 0;
    padding: 0.75rem;
    overflow: auto;
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    background: #020617;
    color: #86efac;
    font-size: 0.7rem;
  }

  @media (max-width: 48rem) {
    .status-grid,
    .dashboard-grid {
      grid-template-columns: 1fr;
    }

    .page-header,
    .mode-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .page-header h1 {
      font-size: 1.75rem;
    }

    .control-list :global(.ui-button) {
      flex: 1 1 10rem;
    }

    .candle-row {
      grid-template-columns: minmax(5rem, 1fr) minmax(5rem, 1fr) minmax(4.5rem, auto);
      gap: 0.5rem;
    }

    .risk-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
