<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    Title,
    Tooltip,
    type ChartConfiguration,
  } from 'chart.js';
  import { THEME_CHANGE_EVENT } from '@lib/theme';
  import { readChartTheme } from '@lib/chart-theme';

  Chart.register(Title, Tooltip, Legend, BarElement, BarController, CategoryScale, LinearScale);

  let { data }: { data: Record<string, number> } = $props();
  let canvas: HTMLCanvasElement;
  let chart: Chart<'bar'> | null = null;

  function getChartData(): { labels: string[]; values: number[] } {
    const labels = Object.keys(data).sort();
    return { labels, values: labels.map((label) => data[label]) };
  }

  function createChart(): void {
    const context = canvas.getContext('2d');
    if (!context) return;
    chart?.destroy();

    const { labels, values } = getChartData();
    const theme = readChartTheme(getComputedStyle(document.documentElement));
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Tracks by decade',
            data: values,
            backgroundColor: theme.colors[1],
            borderColor: theme.colors[0],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: theme.border },
            ticks: { color: theme.muted },
          },
          x: { grid: { display: false }, ticks: { color: theme.muted } },
        },
      },
    };

    chart = new Chart(context, config);
  }

  function updateChart(): void {
    if (!chart) return;
    const { labels, values } = getChartData();
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
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
