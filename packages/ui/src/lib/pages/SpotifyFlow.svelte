<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Controls,
    StatusBanner,
    TrackCard,
    Pagination,
    SearchBar,
    FilterPanel,
  } from '../components';
  import { tracks, topStats, isLoading } from '../stores';
  import { loadTracks } from '../api';

  onMount(() => {
    loadTracks({ page: 1 });
  });
</script>

<div class="min-h-screen p-4 md:p-8">
  <div class="max-w-7xl mx-auto flex flex-col gap-6">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
      <div>
        <a
          href="#/"
          class="text-white/50 hover:text-white text-sm flex items-center gap-1 mb-1 transition-colors"
        >
          <span>←</span> Back to Flows
        </a>
        <h1
          class="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
        >
          Spotify Flow
        </h1>
      </div>

      <!-- Stats Panel (Compact) -->
      <div class="flex gap-4 md:gap-8">
        <div class="text-right">
          <div class="text-2xl font-bold text-white">{$topStats.total}</div>
          <div class="text-xs text-white/40 uppercase tracking-widest">Tracks</div>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-white truncate max-w-[150px]">
            {$topStats.topGenre}
          </div>
          <div class="text-xs text-white/40 uppercase tracking-widest">Top Genre</div>
        </div>
      </div>
    </header>

    <!-- Controls & Status -->
    <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
      <Controls />
      <div class="flex-grow max-w-xl">
        <StatusBanner />
      </div>
    </div>

    <!-- Filters Toolbar -->
    <div
      class="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between sticky top-4 z-10 backdrop-blur-md border border-white/10 shadow-xl relative"
    >
      <div class="flex-grow w-full md:w-auto">
        <SearchBar />
      </div>
      <div class="flex gap-2 w-full md:w-auto">
        <FilterPanel />
      </div>
    </div>

    <!-- Track Grid -->
    <section
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[50vh]"
    >
      {#if $isLoading && $tracks.length === 0}
        <!-- Loading Skeleton -->
        {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
          <div class="glass h-40 rounded-xl animate-pulse"></div>
        {/each}
      {:else}
        {#each $tracks as track (track.id)}
          <TrackCard {track} />
        {:else}
          {#if !$isLoading}
            <div class="col-span-full py-12 text-center text-white/50">
              <div class="text-4xl mb-4">🔍</div>
              <p>No tracks found matching your filters.</p>
              <button
                class="mt-4 text-purple-400 hover:text-purple-300 underline"
                onclick={() => loadTracks({ page: 1, limit: 24 })}
              >
                Clear all filters
              </button>
            </div>
          {/if}
        {/each}
      {/if}
    </section>

    <!-- Pagination -->
    <Pagination />

    <!-- Footer -->
    <footer class="text-center text-white/30 text-sm mt-8 pb-8">
      Flow Sample — Spotify Flow
    </footer>
  </div>
</div>
