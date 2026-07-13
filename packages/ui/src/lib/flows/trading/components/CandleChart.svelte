<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { IChartApi, ISeriesApi, Time, CandlestickData, LineData } from 'lightweight-charts';
  import { readChartTheme } from '@lib/chart-theme';
  import { THEME_CHANGE_EVENT } from '@lib/theme';
  import type { Candle } from '../trading';

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
  let lineSeriesDefinition: typeof import('lightweight-charts').LineSeries | null = null;

  function getTheme() {
    return readChartTheme(getComputedStyle(document.documentElement));
  }

  function applyChartTheme(): void {
    const theme = getTheme();
    chart?.applyOptions({
      layout: { background: { color: 'transparent' }, textColor: theme.muted },
      grid: {
        vertLines: { color: theme.border },
        horzLines: { color: theme.border },
      },
      rightPriceScale: { borderColor: theme.border },
      timeScale: { borderColor: theme.border },
    });
    candlestickSeries?.applyOptions({
      upColor: theme.success,
      downColor: theme.danger,
      borderUpColor: theme.success,
      borderDownColor: theme.danger,
      wickUpColor: theme.success,
      wickDownColor: theme.danger,
    });
    supportLine?.applyOptions({ color: theme.success });
    resistanceLine?.applyOptions({ color: theme.danger });
  }

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

  function updateSupportLine() {
    if (!chart || !lineSeriesDefinition) return;

    if (supportLevel && candles.length > 0) {
      if (!supportLine) {
        supportLine = chart.addSeries(lineSeriesDefinition, {
          color: getTheme().success,
          lineWidth: 2,
          lineStyle: 2, // Dashed
        });
      }
      supportLine.setData(generateLineData(supportLevel, candles));
    } else if (supportLine) {
      chart.removeSeries(supportLine);
      supportLine = null;
    }
  }

  function updateResistanceLine() {
    if (!chart || !lineSeriesDefinition) return;

    if (resistanceLevel && candles.length > 0) {
      if (!resistanceLine) {
        resistanceLine = chart.addSeries(lineSeriesDefinition, {
          color: getTheme().danger,
          lineWidth: 2,
          lineStyle: 2, // Dashed
        });
      }
      resistanceLine.setData(generateLineData(resistanceLevel, candles));
    } else if (resistanceLine) {
      chart.removeSeries(resistanceLine);
      resistanceLine = null;
    }
  }

  onMount(() => {
    if (!chartContainer) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    const handleThemeChange = () => applyChartTheme();
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    async function initChart() {
      const { createChart, CandlestickSeries, LineSeries } = await import('lightweight-charts');
      if (disposed || !chartContainer) return;

      lineSeriesDefinition = LineSeries;
      const theme = getTheme();

      // Create chart with v5 API
      chart = createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: height,
        layout: {
          background: { color: 'transparent' },
          textColor: theme.muted,
        },
        grid: {
          vertLines: { color: theme.border },
          horzLines: { color: theme.border },
        },
        rightPriceScale: {
          borderColor: theme.border,
        },
        timeScale: {
          borderColor: theme.border,
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
        upColor: theme.success,
        downColor: theme.danger,
        borderUpColor: theme.success,
        borderDownColor: theme.danger,
        wickUpColor: theme.success,
        wickDownColor: theme.danger,
      });

      // Set initial data
      if (candles.length > 0) {
        candlestickSeries.setData(transformCandles(candles));
        chart.timeScale().fitContent();
      }

      updateSupportLine();
      updateResistanceLine();

      // Handle resize
      resizeObserver = new ResizeObserver((entries) => {
        if (chart && entries[0]) {
          chart.applyOptions({ width: entries[0].contentRect.width });
        }
      });
      resizeObserver.observe(chartContainer);
    }

    void initChart();

    return () => {
      disposed = true;
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  });

  onDestroy(() => {
    if (chart) {
      chart.remove();
      chart = null;
    }
    candlestickSeries = null;
    supportLine = null;
    resistanceLine = null;
    lineSeriesDefinition = null;
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
    updateSupportLine();
  });

  // Update resistance line
  $effect(() => {
    updateResistanceLine();
  });
</script>

<div class="w-full overflow-hidden rounded-lg border border-border bg-surface-subtle">
  {#if candles.length > 0}
    <div bind:this={chartContainer} style="height: {height}px;"></div>
  {:else}
    <div class="flex items-center justify-center text-muted" style="height: {height}px;">
      No candle data available
    </div>
  {/if}
</div>
