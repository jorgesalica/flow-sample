<script lang="ts">
  import { onMount } from 'svelte';
  import Controls from './components/Controls.svelte';
  import TrackCard from './components/TrackCard.svelte';
  import SearchBar from './components/SearchBar.svelte';
  import FilterPanel from './components/FilterPanel.svelte';
  import InfiniteScroll from '@lib/components/common/InfiniteScroll.svelte';
  import { FlowLayout } from '@lib/components';
  import SpotifyHeader from './components/SpotifyHeader.svelte';
  import InsightsPanel from './components/InsightsPanel.svelte';
  import { spotifyStore } from './stores.svelte';
  import { loadTracks, checkAuthStatus } from './api';
  import type { Track, SearchOptions } from '@flows/shared';
  import type { TopStats } from '@lib/types';

  interface Props {
    tracks?: Track[];
    totalTracks?: number;
    searchOptions?: SearchOptions;
    topStats?: TopStats;
  }

  let { tracks, totalTracks, searchOptions, topStats }: Props = $props();

  // Page title
  const pageTitle = 'Spotify Flow - Your Music Library';

  import { toast } from 'svelte-5-french-toast';

  onMount(() => {
    // Hydrate the runes store from the loader's initial data (mount-time, once).
    if (tracks !== undefined) spotifyStore.tracks = tracks;
    if (totalTracks !== undefined) spotifyStore.totalTracks = totalTracks;
    if (searchOptions !== undefined) spotifyStore.searchOptions = searchOptions;
    if (topStats !== undefined) spotifyStore.topStats = topStats;

    checkAuthStatus();

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
    const nextPage = (spotifyStore.searchOptions.page || 1) + 1;
    loadTracks({ page: nextPage }, true);
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<FlowLayout>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <SpotifyHeader stats={spotifyStore.topStats} />

    <!-- Insights Section -->
    <InsightsPanel stats={spotifyStore.topStats} />

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
      {#if spotifyStore.isLoading && spotifyStore.tracks.length === 0}
        <!-- Loading Skeleton -->
        {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
          <div class="glass h-48 skeleton"></div>
        {/each}
      {:else}
        {#each spotifyStore.tracks as track (track.id)}
          <TrackCard {track} />
        {:else}
          {#if !spotifyStore.isLoading}
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
    {#if spotifyStore.tracks.length > 0}
      <InfiniteScroll
        hasMore={spotifyStore.tracks.length < spotifyStore.totalTracks}
        isLoading={spotifyStore.isLoading}
        onLoadMore={handleLoadMore}
      />
    {/if}

    <!-- Footer -->
    <footer class="text-center text-white/20 text-sm mt-12 pb-8">
      Cosmic Flow — Spotify Edition
    </footer>
  </div>
</FlowLayout>
