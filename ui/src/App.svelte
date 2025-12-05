<script lang="ts">
  import { onMount } from 'svelte';
  import { Controls, StatusBanner, MetricCard, TrackCard } from './lib/components';
  import { filteredTracks, metrics } from './lib/stores';
  import { loadSavedData } from './lib/api';
  import { APP_CONFIG } from './lib/config';

  onMount(() => {
    loadSavedData();
  });
</script>

<div class="min-h-screen p-4 md:p-8">
  <div class="max-w-6xl mx-auto flex flex-col gap-6">
    <!-- Header -->
    <header class="text-center mb-4">
      <h1
        class="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
      >
        {APP_CONFIG.title}
      </h1>
      <p class="text-white/50 mt-2">{APP_CONFIG.tagline}</p>
    </header>

    <!-- Controls -->
    <Controls />

    <!-- Status -->
    <StatusBanner />

    <!-- Metrics -->
    <section class="grid grid-cols-3 gap-4">
      <MetricCard value={$metrics.total} label="Total tracks" />
      <MetricCard value={$metrics.artists} label="Unique artists" />
      <MetricCard value={$metrics.topGenre} label="Top genre" />
    </section>

    <!-- Track Grid -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each $filteredTracks as track (track.id)}
        <TrackCard {track} />
      {:else}
        <div class="col-span-full glass p-8 text-center text-white/50">
          No tracks loaded yet. Let the flow begin.
        </div>
      {/each}
    </section>

    <!-- Footer -->
    <footer class="text-center text-white/30 text-sm mt-8">
      Flow Sample — An improvisational data vignette.
    </footer>
  </div>
</div>
