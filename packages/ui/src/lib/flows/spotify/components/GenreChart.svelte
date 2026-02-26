<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    DoughnutController,
    CategoryScale,
    type ChartConfiguration,
  } from 'chart.js';
  import type { GenreCount } from '@lib/types';

  Chart.register(Title, Tooltip, Legend, ArcElement, DoughnutController, CategoryScale);

  let { data } = $props<{
    data: GenreCount[];
  }>();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  // Cosmic Flow color palette for charts
  const cosmicColors = [
    'rgba(52, 211, 153, 0.85)', // Aurora (emerald)
    'rgba(59, 130, 246, 0.85)', // Nebula (blue)
    'rgba(139, 92, 246, 0.85)', // Cosmic purple
    'rgba(236, 72, 153, 0.85)', // Pink accent
    'rgba(6, 182, 212, 0.85)', // Cyan
    'rgba(16, 185, 129, 0.85)', // Teal
    'rgba(99, 102, 241, 0.85)', // Indigo
    'rgba(168, 85, 247, 0.85)', // Purple
  ];

  function updateChart() {
    if (!chart) return;

    chart.data.labels = data.map((d: GenreCount) => d.genre);
    chart.data.datasets[0].data = data.map((d: GenreCount) => d.count);
    chart.update();
  }

  onMount(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: data.map((d: GenreCount) => d.genre),
        datasets: [
          {
            data: data.map((d: GenreCount) => d.count),
            backgroundColor: cosmicColors,
            borderColor: 'rgba(15, 23, 42, 0.8)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'rgba(148, 163, 184, 0.9)',
              padding: 12,
              font: {
                size: 11,
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: 'rgba(226, 232, 240, 1)',
            bodyColor: 'rgba(148, 163, 184, 1)',
            borderColor: 'rgba(52, 211, 153, 0.3)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
          },
        },
      },
    };

    chart = new Chart(ctx, config);
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  });

  $effect(() => {
    // React to data changes
    if (data) updateChart();
  });
</script>

<div class="h-64 flex justify-center items-center w-full">
  <canvas bind:this={canvas} class="max-h-full"></canvas>
</div>
