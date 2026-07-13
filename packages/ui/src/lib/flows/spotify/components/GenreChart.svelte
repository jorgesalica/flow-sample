<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    ArcElement,
    CategoryScale,
    Chart,
    DoughnutController,
    Legend,
    Title,
    Tooltip,
    type ChartConfiguration,
  } from 'chart.js';
  import type { GenreCount } from '@flows/shared';
  import { THEME_CHANGE_EVENT } from '@lib/theme';
  import { readChartTheme } from '@lib/chart-theme';

  Chart.register(Title, Tooltip, Legend, ArcElement, DoughnutController, CategoryScale);

  let { data }: { data: GenreCount[] } = $props();
  let canvas: HTMLCanvasElement;
  let chart: Chart<'doughnut'> | null = null;

  function createChart(): void {
    const context = canvas.getContext('2d');
    if (!context) return;
    chart?.destroy();

    const theme = readChartTheme(getComputedStyle(document.documentElement));
    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: data.map((item) => item.genre),
        datasets: [
          {
            data: data.map((item) => item.count),
            backgroundColor: theme.colors,
            borderColor: theme.surface,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: theme.muted, padding: 12, font: { size: 11 } },
          },
          tooltip: {
            backgroundColor: theme.surface,
            titleColor: theme.text,
            bodyColor: theme.muted,
            borderColor: theme.border,
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
          },
        },
      },
    };

    chart = new Chart(context, config);
  }

  function updateChart(): void {
    if (!chart) return;
    chart.data.labels = data.map((item) => item.genre);
    chart.data.datasets[0].data = data.map((item) => item.count);
    chart.update();
  }

  onMount(() => {
    createChart();
    window.addEventListener(THEME_CHANGE_EVENT, createChart);
  });

  onDestroy(() => {
    window.removeEventListener(THEME_CHANGE_EVENT, createChart);
    chart?.destroy();
    chart = null;
  });

  $effect(() => {
    if (data) updateChart();
  });
</script>

<div class="chart-container">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container {
    width: 100%;
    height: 16rem;
    min-width: 0;
  }
</style>
