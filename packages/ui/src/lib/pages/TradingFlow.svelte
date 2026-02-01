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

<div class="max-w-6xl mx-auto px-4 py-8 text-white/90">
  <!-- Header -->
  <header class="text-center mb-8">
    <a href="#/" class="inline-block mb-4 text-white/50 hover:text-amber-400 transition-colors"
      >← Back</a
    >
    <h1
      class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
    >
      📈 Trading Bot
    </h1>
    <p class="text-white/40 mt-2">
      Real-time BTC analysis with Hurst exponent, fractals, and AI insights
    </p>
  </header>

  <!-- Status Panel -->
  <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    <div class="glass p-4 rounded-xl flex items-center gap-3">
      <div
        class="w-3 h-3 rounded-full transition-all duration-300 {state.isRunning
          ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
          : 'bg-white/20'}"
      ></div>
      <div class="flex-1">
        <div class="text-xs text-white/40 uppercase tracking-wider">Stream</div>
        <div class="text-sm font-semibold">{state.isRunning ? 'Connected' : 'Disconnected'}</div>
      </div>
    </div>

    <div class="glass p-4 rounded-xl flex items-center gap-3">
      <span class="text-2xl">₿</span>
      <div class="flex-1">
        <div class="text-xs text-white/40 uppercase tracking-wider">{state.symbol}</div>
        <div class="text-sm font-semibold text-amber-400">
          ${formatPrice(state.lastCandle?.close)}
        </div>
      </div>
    </div>

    <div class="glass p-4 rounded-xl flex items-center gap-3">
      <span class="text-2xl">📊</span>
      <div class="flex-1">
        <div class="text-xs text-white/40 uppercase tracking-wider">Candles</div>
        <div class="text-sm font-semibold">{state.candleCount.toLocaleString()}</div>
      </div>
    </div>

    <div class="glass p-4 rounded-xl flex items-center gap-3">
      <span class="text-2xl">⏱️</span>
      <div class="flex-1">
        <div class="text-xs text-white/40 uppercase tracking-wider">Last Update</div>
        <div class="text-sm font-semibold">{formatTime(state.lastCandle?.closeTime || null)}</div>
      </div>
    </div>
  </section>

  <!-- Control Panel -->
  <section class="glass p-6 rounded-xl mb-8">
    <h2 class="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">Controls</h2>
    <div class="flex flex-wrap gap-3">
      {#if state.isRunning}
        <button
          onclick={stopTrading}
          class="px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all font-medium"
        >
          ⏹️ Stop Stream
        </button>
      {:else}
        <button
          onclick={startTrading}
          class="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all font-medium"
        >
          ▶️ Start Stream
        </button>
      {/if}

      <button
        onclick={toggleAdvisor}
        class="px-6 py-3 rounded-lg transition-all font-medium {advisor.isEnabled
          ? 'bg-gradient-to-r from-amber-500 to-orange-600'
          : 'bg-white/5 hover:bg-white/10 border border-white/20'}"
      >
        {advisor.isEnabled ? '🧠 Advisor ON' : '💤 Advisor OFF'}
      </button>

      <button
        onclick={generateInsight}
        disabled={loadingInsight}
        class="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingInsight ? '⏳ Generating...' : '✨ Generate Insight'}
      </button>
    </div>
  </section>

  <!-- Main Content Grid -->
  <div class="grid md:grid-cols-2 gap-6">
    <!-- Candle Feed -->
    <section class="glass p-6 rounded-xl">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        📈 <span>Live Candles</span>
      </h3>
      <div class="max-h-96 overflow-y-auto space-y-2">
        {#each candleList.slice(-20).reverse() as candle (candle.openTime)}
          <div
            class="flex justify-between items-center py-2 px-3 rounded-lg bg-white/5 border-b border-white/5 font-mono text-xs"
          >
            <span class="text-white/40">{formatTime(candle.openTime)}</span>
            <span class="text-amber-400 font-semibold">${formatPrice(candle.close)}</span>
            <span
              class="font-semibold {candle.close > candle.open ? 'text-green-500' : 'text-red-500'}"
            >
              {candle.close > candle.open ? '↑' : '↓'}
              {Math.abs(((candle.close - candle.open) / candle.open) * 100).toFixed(3)}%
            </span>
          </div>
        {:else}
          <p class="text-center text-white/30 py-8">
            No candles yet. Start the stream to collect data.
          </p>
        {/each}
      </div>
    </section>

    <!-- Advisor Insight -->
    <section class="glass p-6 rounded-xl">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        🧠 <span>Advisor Insight</span>
      </h3>
      {#if insight}
        <div class="space-y-4 max-h-96 overflow-y-auto">
          <h4 class="text-xl font-bold text-amber-400">{insight.title}</h4>

          {#if insight.regime_context}
            <div class="p-4 rounded-lg bg-white/5">
              <div class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                📊 Regime Context
              </div>
              <p class="text-sm leading-relaxed">{insight.regime_context}</p>
            </div>
          {/if}

          {#if insight.scenario_bullish}
            <div class="p-4 rounded-lg bg-white/5 border-l-4 border-green-500">
              <div class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                🟢 Bullish Scenario
              </div>
              <p class="text-sm leading-relaxed">{insight.scenario_bullish}</p>
            </div>
          {/if}

          {#if insight.scenario_bearish}
            <div class="p-4 rounded-lg bg-white/5 border-l-4 border-red-500">
              <div class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                🔴 Bearish Scenario
              </div>
              <p class="text-sm leading-relaxed">{insight.scenario_bearish}</p>
            </div>
          {/if}

          {#if insight.mentor_tip}
            <div class="p-4 rounded-lg bg-indigo-500/10 border-l-4 border-indigo-500">
              <div class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                💡 Mentor Tip
              </div>
              <p class="text-sm leading-relaxed">{insight.mentor_tip}</p>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-center text-white/30 py-8">
          No insights available yet. Collect some data and click "Generate Insight".
        </p>
      {/if}
    </section>
  </div>
</div>
