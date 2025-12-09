<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Controls,
    TrackCard,
    SearchBar,
    FilterPanel,
    InfiniteScroll,
    Navbar,
    SpotifyHeader,
    InsightsPanel,
  } from '@lib/components';
  import { tracks, topStats, isLoading, totalTracks, searchOptions } from '@lib/stores';
  import { loadTracks, checkAuthStatus } from '@lib/api';

  // Page title
  const pageTitle = 'Spotify Flow - Your Music Library';

  import { toast } from 'svelte-5-french-toast';

  onMount(() => {
    checkAuthStatus();
    loadTracks({ page: 1 });

    // Check for success redirect
    const url = new URL(window.location.href);
    if (url.searchParams.get('connected') === 'true') {
      toast.success('Successfully connected to Spotify!', {
        position: 'bottom-right',
        className: 'glass text-cosmic font-medium',
      });
      // Clean up URL
      url.searchParams.delete('connected');
      window.history.replaceState({}, '', url.toString());
    }
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

<div class="min-h-screen pt-28 p-4 md:p-8">
  <div class="max-w-7xl mx-auto flex flex-col gap-6">
    <!-- Header -->
    <SpotifyHeader stats={$topStats} />

    <!-- Insights Section -->
    <InsightsPanel stats={$topStats} />

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
