<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    Title,
    Tooltip,
    Legend,
    BarElement,
    BarController,
    CategoryScale,
    LinearScale,
    type ChartConfiguration,
  } from 'chart.js';

  Chart.register(Title, Tooltip, Legend, BarElement, BarController, CategoryScale, LinearScale);

  let { data } = $props<{
    data: Record<string, number>;
  }>();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function updateChart() {
    if (!chart) return;

    const labels = Object.keys(data).sort();
    const values = labels.map((k) => data[k]);

    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
  }

  onMount(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = Object.keys(data).sort();
    const values = labels.map((k) => data[k]);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Tracks by Decade',
            data: values,
            backgroundColor: 'rgba(168, 85, 247, 0.6)', // Purple-500
            borderColor: 'rgba(168, 85, 247, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
            },
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
    if (data) updateChart();
  });
</script>

<div class="h-64 w-full flex justify-center items-center">
  <canvas bind:this={canvas} class="w-full h-full"></canvas>
</div>
