<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-5-french-toast';
  import type { GenreCount, SearchOptions, Track, YearCount } from '@flows/shared';
  import { AsyncState, Button, FlowLayout } from '@lib/components';
  import InfiniteScroll from '@lib/components/common/InfiniteScroll.svelte';
  import type { TopStats } from '@lib/types';
  import { loadTracks } from './api';
  import Controls from './components/Controls.svelte';
  import FilterPanel from './components/FilterPanel.svelte';
  import InsightsPanel from './components/InsightsPanel.svelte';
  import SearchBar from './components/SearchBar.svelte';
  import SpotifyHeader from './components/SpotifyHeader.svelte';
  import TrackCard from './components/TrackCard.svelte';
  import { spotifyStore } from './stores.svelte';

  interface Props {
    tracks?: Track[];
    totalTracks?: number;
    searchOptions?: SearchOptions;
    topStats?: TopStats;
    genres?: GenreCount[];
    years?: YearCount[];
    isAuthenticated?: boolean;
  }

  let {
    tracks,
    totalTracks,
    searchOptions,
    topStats,
    genres = [],
    years = [],
    isAuthenticated,
  }: Props = $props();

  $effect(() => {
    if (tracks !== undefined) spotifyStore.tracks = tracks;
    if (totalTracks !== undefined) spotifyStore.totalTracks = totalTracks;
    if (searchOptions !== undefined) spotifyStore.searchOptions = searchOptions;
    if (topStats !== undefined) spotifyStore.topStats = topStats;
    if (isAuthenticated !== undefined) spotifyStore.isAuthenticated = isAuthenticated;
  });

  onMount(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('connected') === 'true') {
      toast.success('Successfully connected to Spotify!', {
        position: 'bottom-right',
        className: 'glass text-cosmic font-medium',
      });
      url.searchParams.delete('connected');
      window.history.replaceState({}, '', url.toString());
    }
  });

  function handleLoadMore() {
    loadTracks({ page: (spotifyStore.searchOptions.page || 1) + 1 }, true);
  }

  function clearFilters() {
    loadTracks({
      page: 1,
      limit: 24,
      q: '',
      genre: undefined,
      year: undefined,
      sortBy: 'added_at',
      sortOrder: 'desc',
    });
  }
</script>

<svelte:head>
  <title>Spotify Flow - Your Music Library</title>
</svelte:head>

<FlowLayout>
  <div class="flex flex-col gap-6" data-theme="organic">
    <SpotifyHeader stats={spotifyStore.topStats} />
    <InsightsPanel stats={spotifyStore.topStats} />

    <div class="flex items-center"><Controls /></div>

    <div
      class="glass sticky top-4 z-10 flex flex-col items-center justify-between gap-4 p-4 md:flex-row"
    >
      <div class="w-full flex-grow md:w-auto"><SearchBar /></div>
      <div class="flex w-full gap-2 md:w-auto"><FilterPanel {genres} {years} /></div>
    </div>

    <section class="min-h-[50vh]" aria-label="Spotify tracks">
      {#if spotifyStore.isLoading && spotifyStore.tracks.length === 0}
        <AsyncState state="loading" title="Loading your library" />
      {:else if spotifyStore.tracks.length === 0}
        {#snippet clearFiltersAction()}
          <Button variant="secondary" onclick={clearFilters}>Clear all filters</Button>
        {/snippet}
        <AsyncState
          state="empty"
          title="No tracks found"
          message="Try clearing the current search and filters."
          action={clearFiltersAction}
        />
      {:else}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {#each spotifyStore.tracks as track (track.id)}
            <TrackCard {track} />
          {/each}
        </div>
      {/if}
    </section>

    {#if spotifyStore.tracks.length > 0}
      <InfiniteScroll
        hasMore={spotifyStore.tracks.length < spotifyStore.totalTracks}
        isLoading={spotifyStore.isLoading}
        onLoadMore={handleLoadMore}
      />
    {/if}

    <footer class="mt-12 pb-8 text-center text-sm text-white/20">Flow Sample - Spotify</footer>
  </div>
</FlowLayout>
