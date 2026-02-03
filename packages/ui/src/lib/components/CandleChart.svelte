<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    createChart,
    CandlestickSeries,
    LineSeries,
    type IChartApi,
    type ISeriesApi,
    type Time,
    type CandlestickData,
    type LineData,
  } from 'lightweight-charts';
  import type { Candle } from '../flows/trading';

  interface Props {
    candles: Candle[];
    supportLevel?: number;
    resistanceLevel?: number;
    height?: number;
  }

  let { candles, supportLevel, resistanceLevel, height = 400 }: Props = $props();

  let chartContainer = $state<HTMLDivElement>();
  let chart: IChartApi | null = null;
  let candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
  let supportLine: ISeriesApi<'Line'> | null = null;
  let resistanceLine: ISeriesApi<'Line'> | null = null;

  // Transform candles to lightweight-charts format (time in seconds)
  function transformCandles(data: Candle[]): CandlestickData<Time>[] {
    return data.map((c) => ({
      time: Math.floor(c.openTime / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }

  // Generate line data for S/R levels
  function generateLineData(level: number, data: Candle[]): LineData<Time>[] {
    if (!data.length) return [];
    return [
      { time: Math.floor(data[0].openTime / 1000) as Time, value: level },
      { time: Math.floor(data[data.length - 1].openTime / 1000) as Time, value: level },
    ];
  }

  onMount(() => {
    if (!chartContainer) return;

    // Create chart with v5 API
    chart = createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: height,
      layout: {
        background: { color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.7)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        },
      },
    });

    // Add candlestick series using v5 API
    candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Set initial data
    if (candles.length > 0) {
      candlestickSeries.setData(transformCandles(candles));
      chart.timeScale().fitContent();
    }

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (chart && entries[0]) {
        chart.applyOptions({ width: entries[0].contentRect.width });
      }
    });
    resizeObserver.observe(chartContainer);

    return () => {
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    if (chart) {
      chart.remove();
      chart = null;
    }
  });

  // Update data when candles change
  $effect(() => {
    if (candlestickSeries && candles.length > 0) {
      candlestickSeries.setData(transformCandles(candles));
      chart?.timeScale().fitContent();
    }
  });

  // Update support line
  $effect(() => {
    if (!chart) return;

    if (supportLevel && candles.length > 0) {
      if (!supportLine) {
        supportLine = chart.addSeries(LineSeries, {
          color: '#22c55e',
          lineWidth: 2,
          lineStyle: 2, // Dashed
        });
      }
      supportLine.setData(generateLineData(supportLevel, candles));
    } else if (supportLine) {
      chart.removeSeries(supportLine);
      supportLine = null;
    }
  });

  // Update resistance line
  $effect(() => {
    if (!chart) return;

    if (resistanceLevel && candles.length > 0) {
      if (!resistanceLine) {
        resistanceLine = chart.addSeries(LineSeries, {
          color: '#ef4444',
          lineWidth: 2,
          lineStyle: 2, // Dashed
        });
      }
      resistanceLine.setData(generateLineData(resistanceLevel, candles));
    } else if (resistanceLine) {
      chart.removeSeries(resistanceLine);
      resistanceLine = null;
    }
  });
</script>

<div class="w-full rounded-xl overflow-hidden bg-black/20 border border-white/10">
  {#if candles.length > 0}
    <div bind:this={chartContainer} style="height: {height}px;"></div>
  {:else}
    <div class="flex items-center justify-center text-white/30" style="height: {height}px;">
      No candle data available
    </div>
  {/if}
</div>
