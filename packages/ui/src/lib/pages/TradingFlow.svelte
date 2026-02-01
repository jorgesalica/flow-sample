<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    tradingState,
    advisorState,
    candles,
    latestInsight,
    isLoadingInsight,
    fetchTradingStatus,
    startTrading,
    stopTrading,
    fetchCandles,
    toggleAdvisor,
    generateInsight,
    fetchLatestInsight,
    connectToStream,
    disconnectFromStream,
  } from '../flows/trading';

  // Local derived state
  let state = $derived($tradingState);
  let advisor = $derived($advisorState);
  let insight = $derived($latestInsight);
  let candleList = $derived($candles);
  let loadingInsight = $derived($isLoadingInsight);

  // Format price with commas
  function formatPrice(price: number | undefined): string {
    if (!price) return '—';
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Format timestamp
  function formatTime(ts: number | string | null): string {
    if (!ts) return '—';
    const date = typeof ts === 'string' ? new Date(ts) : new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  onMount(() => {
    fetchTradingStatus();
    fetchCandles(100);
    fetchLatestInsight();
    connectToStream();
  });

  onDestroy(() => {
    disconnectFromStream();
  });
</script>

<div class="trading-page">
  <!-- Header -->
  <header class="page-header">
    <a href="#/" class="back-link">← Back</a>
    <h1>📈 Trading Bot</h1>
    <p class="subtitle">Real-time BTC analysis with Hurst exponent, fractals, and AI insights</p>
  </header>

  <!-- Status Panel -->
  <section class="status-panel">
    <div class="status-card">
      <div class="status-indicator" class:active={state.isRunning}></div>
      <div class="status-info">
        <span class="status-label">Stream Status</span>
        <span class="status-value">{state.isRunning ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>

    <div class="status-card">
      <span class="status-icon">₿</span>
      <div class="status-info">
        <span class="status-label">{state.symbol}</span>
        <span class="status-value price">${formatPrice(state.lastCandle?.close)}</span>
      </div>
    </div>

    <div class="status-card">
      <span class="status-icon">📊</span>
      <div class="status-info">
        <span class="status-label">Candles</span>
        <span class="status-value">{state.candleCount.toLocaleString()}</span>
      </div>
    </div>

    <div class="status-card">
      <span class="status-icon">⏱️</span>
      <div class="status-info">
        <span class="status-label">Last Update</span>
        <span class="status-value">{formatTime(state.lastCandle?.closeTime || null)}</span>
      </div>
    </div>
  </section>

  <!-- Control Panel -->
  <section class="control-panel">
    <h2>Controls</h2>
    <div class="button-group">
      {#if state.isRunning}
        <button class="btn btn-danger" onclick={stopTrading}> ⏹️ Stop Stream </button>
      {:else}
        <button class="btn btn-primary" onclick={startTrading}> ▶️ Start Stream </button>
      {/if}

      <button class="btn" class:btn-active={advisor.isEnabled} onclick={toggleAdvisor}>
        {advisor.isEnabled ? '🧠 Advisor ON' : '💤 Advisor OFF'}
      </button>

      <button class="btn btn-secondary" onclick={generateInsight} disabled={loadingInsight}>
        {loadingInsight ? '⏳ Generating...' : '✨ Generate Insight'}
      </button>
    </div>
  </section>

  <!-- Main Content Grid -->
  <div class="content-grid">
    <!-- Candle Feed -->
    <section class="card candle-feed">
      <h3>📈 Live Candles</h3>
      <div class="candle-list">
        {#each candleList.slice(-20).reverse() as candle (candle.openTime)}
          <div
            class="candle-row"
            class:up={candle.close > candle.open}
            class:down={candle.close < candle.open}
          >
            <span class="candle-time">{formatTime(candle.openTime)}</span>
            <span class="candle-price">${formatPrice(candle.close)}</span>
            <span class="candle-change">
              {candle.close > candle.open ? '↑' : '↓'}
              {Math.abs(((candle.close - candle.open) / candle.open) * 100).toFixed(3)}%
            </span>
          </div>
        {:else}
          <p class="empty-state">No candles yet. Start the stream to collect data.</p>
        {/each}
      </div>
    </section>

    <!-- Advisor Insight -->
    <section class="card advisor-insight">
      <h3>🧠 Advisor Insight</h3>
      {#if insight}
        <div class="insight-content">
          <h4>{insight.title}</h4>

          {#if insight.regime_context}
            <div class="insight-section">
              <span class="section-label">📊 Regime Context</span>
              <p>{insight.regime_context}</p>
            </div>
          {/if}

          {#if insight.scenario_bullish}
            <div class="insight-section bullish">
              <span class="section-label">🟢 Bullish Scenario</span>
              <p>{insight.scenario_bullish}</p>
            </div>
          {/if}

          {#if insight.scenario_bearish}
            <div class="insight-section bearish">
              <span class="section-label">🔴 Bearish Scenario</span>
              <p>{insight.scenario_bearish}</p>
            </div>
          {/if}

          {#if insight.mentor_tip}
            <div class="insight-section tip">
              <span class="section-label">💡 Mentor Tip</span>
              <p>{insight.mentor_tip}</p>
            </div>
          {/if}
        </div>
      {:else}
        <p class="empty-state">
          No insights available yet. Collect some data and click "Generate Insight".
        </p>
      {/if}
    </section>
  </div>
</div>

<style>
  .trading-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    color: #e0e0e0;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-block;
    margin-bottom: 1rem;
    color: #888;
    text-decoration: none;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: #f59e0b;
  }

  .page-header h1 {
    font-size: 2.5rem;
    margin: 0;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: #888;
    margin-top: 0.5rem;
  }

  /* Status Panel */
  .status-panel {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .status-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #666;
    transition: background 0.3s;
  }

  .status-indicator.active {
    background: #22c55e;
    box-shadow: 0 0 10px #22c55e;
  }

  .status-icon {
    font-size: 1.5rem;
  }

  .status-info {
    display: flex;
    flex-direction: column;
  }

  .status-label {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
  }

  .status-value {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .status-value.price {
    color: #f59e0b;
  }

  /* Control Panel */
  .control-panel {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .control-panel h2 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: #888;
  }

  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: #e0e0e0;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    border-color: #22c55e;
  }

  .btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-color: #ef4444;
  }

  .btn-secondary {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border-color: #6366f1;
  }

  .btn-active {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    border-color: #f59e0b;
  }

  /* Content Grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 900px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .card h3 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: #ccc;
  }

  /* Candle Feed */
  .candle-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .candle-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85rem;
  }

  .candle-row.up .candle-change {
    color: #22c55e;
  }

  .candle-row.down .candle-change {
    color: #ef4444;
  }

  .candle-time {
    color: #666;
  }

  .candle-price {
    color: #f59e0b;
  }

  /* Advisor Insight */
  .advisor-insight {
    max-height: 500px;
    overflow-y: auto;
  }

  .insight-content h4 {
    margin: 0 0 1rem;
    color: #f59e0b;
    font-size: 1.2rem;
  }

  .insight-section {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
  }

  .section-label {
    display: block;
    font-size: 0.75rem;
    color: #888;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
  }

  .insight-section p {
    margin: 0;
    line-height: 1.5;
  }

  .insight-section.bullish {
    border-left: 3px solid #22c55e;
  }

  .insight-section.bearish {
    border-left: 3px solid #ef4444;
  }

  .insight-section.tip {
    border-left: 3px solid #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }

  .empty-state {
    color: #666;
    text-align: center;
    padding: 2rem;
  }
</style>
