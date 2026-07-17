<script lang="ts">
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { toast } from 'svelte-5-french-toast';
  import type { GenreCount, SearchOptions, Track, YearCount } from '@flows/shared';
  import { AsyncState, Button, FlowLayout, Panel } from '@lib/components';
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
      });
      url.searchParams.delete('connected');
      replaceState(url, {});
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
  <div class="spotify-flow">
    <SpotifyHeader stats={spotifyStore.topStats} />
    <InsightsPanel stats={spotifyStore.topStats} />

    <div class="flex items-center"><Controls /></div>

    <div class="spotify-toolbar">
      <Panel padding="sm">
        <div class="spotify-toolbar__content">
          <div class="spotify-toolbar__search"><SearchBar /></div>
          <div><FilterPanel {genres} {years} /></div>
        </div>
      </Panel>
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

    <footer>Flow Sample - Spotify</footer>
  </div>
</FlowLayout>

<style>
  .spotify-flow {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 1.5rem;
  }

  .spotify-toolbar {
    position: sticky;
    top: calc(var(--app-nav-height) + 0.5rem);
    z-index: 10;
  }

  .spotify-toolbar__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .spotify-toolbar__search {
    width: 100%;
    flex: 1 1 auto;
  }

  footer {
    margin-top: 2rem;
    padding-bottom: 2rem;
    color: var(--ui-text-muted);
    font-size: 0.75rem;
    text-align: center;
  }

  @media (max-width: 48rem) {
    .spotify-toolbar__content {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
