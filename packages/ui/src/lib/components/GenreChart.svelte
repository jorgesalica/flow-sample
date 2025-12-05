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

  Chart.register(Title, Tooltip, Legend, ArcElement, DoughnutController, CategoryScale);

  let { data } = $props<{
    data: { genre: string; count: number }[];
  }>();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function updateChart() {
    if (!chart) return;

    chart.data.labels = data.map((d) => d.genre);
    chart.data.datasets[0].data = data.map((d) => d.count);
    chart.update();
  }

  onMount(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.genre),
        datasets: [
          {
            data: data.map((d) => d.count),
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 159, 64, 0.8)',
            ],
            borderColor: 'rgba(0, 0, 0, 0.2)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
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
    // React to data changes
    if (data) updateChart();
  });
</script>

<div class="h-64 flex justify-center items-center w-full">
  <canvas bind:this={canvas} class="max-h-full"></canvas>
</div>
