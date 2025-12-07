<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Controls,
    TrackCard,
    SearchBar,
    FilterPanel,
    InfiniteScroll,
    GenreChart,
    DecadeChart,
    Navbar,
  } from '../components';
  import { tracks, topStats, isLoading, totalTracks, searchOptions } from '../stores';
  import { loadTracks } from '../api';

  // Page title
  const pageTitle = 'Spotify Flow - Your Music Library';

  onMount(() => {
    loadTracks({ page: 1 });
  });

  function handleLoadMore() {
    const nextPage = ($searchOptions.page || 1) + 1;
    loadTracks({ page: nextPage }, true);
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Navbar />

<div class="min-h-screen pt-16 p-4 md:p-8">
  <div class="max-w-7xl mx-auto flex flex-col gap-6">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
      <div>
        <a
          href="#/"
          class="text-white/50 hover:text-white text-sm flex items-center gap-1 mb-2 transition-colors group"
        >
          <span class="group-hover:-translate-x-1 transition-transform">←</span> Back to Flows
        </a>
        <h1 class="text-4xl md:text-5xl font-bold text-aurora">Spotify Flow</h1>
        <p class="text-white/40 text-sm mt-1">Your music library, visualized</p>
      </div>

      <!-- Stats Panel (Compact) -->
      <div class="flex gap-6 md:gap-10">
        <div class="text-right">
          <div class="text-3xl font-bold text-aurora">{$topStats.total}</div>
          <div class="text-xs text-white/40 uppercase tracking-widest">Tracks</div>
        </div>
        <div class="text-right">
          <div class="text-xl font-semibold text-white truncate max-w-[150px]">
            {$topStats.topGenre}
          </div>
          <div class="text-xs text-white/40 uppercase tracking-widest">Top Genre</div>
        </div>
      </div>
    </header>

    <!-- Insights Section -->
    {#if $topStats.genres.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Genre Chart -->
        <div class="glass glass-hover p-6">
          <h3 class="text-lg font-semibold text-white/90 mb-4">Top Genres</h3>
          <GenreChart data={$topStats.genres.slice(0, 6)} />
        </div>

        <!-- Decade/Timeline Chart -->
        <div class="glass glass-hover p-6">
          <h3 class="text-lg font-semibold text-white/90 mb-4">Eras</h3>
          <DecadeChart data={$topStats.decadeDistribution} />
        </div>
      </div>
    {/if}

    <!-- Controls -->
    <div class="flex items-center">
      <Controls />
    </div>

    <!-- Filters Toolbar -->
    <div
      class="glass p-4 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-4 z-10"
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
          <div class="glass h-48 skeleton"></div>
        {/each}
      {:else}
        {#each $tracks as track (track.id)}
          <TrackCard {track} />
        {:else}
          {#if !$isLoading}
            <div class="col-span-full py-16 text-center">
              <div class="text-5xl mb-4 opacity-30">🔍</div>
              <p class="text-white/50">No tracks found matching your filters.</p>
              <button
                class="mt-4 text-aurora hover:opacity-80 underline transition-opacity"
                onclick={() => loadTracks({ page: 1, limit: 24 })}
              >
                Clear all filters
              </button>
            </div>
          {/if}
        {/each}
      {/if}
    </section>

    <!-- Infinite Scroll Trigger -->
    {#if $tracks.length > 0}
      <InfiniteScroll
        hasMore={$tracks.length < $totalTracks}
        isLoading={$isLoading}
        onLoadMore={handleLoadMore}
      />
    {/if}

    <!-- Footer -->
    <footer class="text-center text-white/20 text-sm mt-12 pb-8">
      Cosmic Flow — Spotify Edition
    </footer>
  </div>
</div>
