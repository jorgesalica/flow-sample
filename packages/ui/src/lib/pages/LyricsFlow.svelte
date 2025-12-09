<script lang="ts">
  import { onMount } from 'svelte';
  import type { LyricsStats } from '@flows/shared';
  import { getLyricsStats, getLyricsLibrary, fetchAllLyrics } from '@lib/lyricsApi';
  import { toast } from '@lib/toast';
  import { Navbar } from '@lib/components';

  let stats = $state<LyricsStats | null>(null);
  let tracks = $state<
    Array<{ id: string; title: string; artist: string; imageUrl: string | null; status: string }>
  >([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let isFetchingLyrics = $state(false);

  // Load data
  async function refreshData() {
    loading = true;
    try {
      const [statsData, tracksData] = await Promise.all([getLyricsStats(), getLyricsLibrary()]);
      stats = statsData;
      tracks = tracksData;
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    refreshData();
  });

  async function handleFetchAllLyrics() {
    isFetchingLyrics = true;
    const toastId = toast.loading('Fetching lyrics for all pending tracks...');

    try {
      const result = await fetchAllLyrics();
      toast.dismiss(toastId);

      const message = `Lyrics Sync Complete: ${result.found} found, ${result.notFound} not available.`;
      if (result.errors > 0) {
        toast.error(`${message} (${result.errors} errors)`);
      } else {
        toast.success(message);
      }

      // Refresh data to show updates
      await refreshData();
    } catch (e) {
      toast.dismiss(toastId);
      toast.error('Failed to fetch lyrics batch');
      console.error(e);
    } finally {
      isFetchingLyrics = false;
    }
  }

  function getPercentage(value: number, total: number): string {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'found':
        return 'text-aurora bg-aurora/10 border-aurora/20';
      case 'not_found':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-pulsar bg-pulsar/10 border-pulsar/20';
    }
  }
</script>

<Navbar />

<div class="h-full w-full overflow-hidden flex flex-col pt-24 pb-8 px-6 md:px-12 max-w-7xl mx-auto">
  <!-- Header -->
  <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
    <div>
      <h1 class="text-3xl md:text-4xl font-bold text-cosmic flex items-center gap-3">
        <span>🎤</span> Lyrics Dashboard
      </h1>
      <p class="text-pulsar mt-2 max-w-xl">
        Manage lyrics availability. To read lyrics, visit the
        <a href="#/spotify" class="text-aurora hover:underline">Spotify Flow</a>.
      </p>
    </div>

    <!-- Actions -->
    <button
      onclick={handleFetchAllLyrics}
      disabled={isFetchingLyrics || loading}
      class="btn-primary flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if isFetchingLyrics}
        <div
          class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
        ></div>
        Fetching...
      {:else}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        Fetch Missing Lyrics
      {/if}
    </button>
  </header>

  {#if loading && !tracks.length}
    <div class="flex-grow flex flex-col items-center justify-center text-pulsar min-h-[400px]">
      <div
        class="w-12 h-12 border-4 border-aurora border-t-transparent rounded-full animate-spin mb-4"
      ></div>
      <p>Loading lyrics data...</p>
    </div>
  {:else if error}
    <div class="flex-grow flex items-center justify-center p-8">
      <div
        class="bg-red-500/10 border border-red-500/20 text-red-200 p-6 rounded-xl text-center max-w-md"
      >
        <p class="font-bold text-lg mb-2">Error Loading Data</p>
        <p>{error}</p>
        <button
          class="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
          onclick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    </div>
  {:else if stats}
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
      <!-- Total Tracks -->
      <div class="glass p-5 rounded-2xl border-l-4 border-nebula">
        <h3 class="text-pulsar text-xs font-bold uppercase tracking-wider mb-1">Total Tracks</h3>
        <p class="text-3xl font-bold text-cosmic">{stats.total}</p>
      </div>

      <!-- Found -->
      <div class="glass p-5 rounded-2xl border-l-4 border-aurora">
        <h3 class="text-pulsar text-xs font-bold uppercase tracking-wider mb-1">Found</h3>
        <div class="flex justify-between items-end">
          <p class="text-3xl font-bold text-cosmic">{stats.found}</p>
          <p class="text-sm text-aurora font-medium">{getPercentage(stats.found, stats.total)}</p>
        </div>
      </div>

      <!-- Not Found -->
      <div class="glass p-5 rounded-2xl border-l-4 border-red-400">
        <h3 class="text-pulsar text-xs font-bold uppercase tracking-wider mb-1">Not Found</h3>
        <div class="flex justify-between items-end">
          <p class="text-3xl font-bold text-cosmic">{stats.notFound}</p>
          <p class="text-sm text-red-400 font-medium">
            {getPercentage(stats.notFound, stats.total)}
          </p>
        </div>
      </div>

      <!-- Pending -->
      <div class="glass p-5 rounded-2xl border-l-4 border-pulsar">
        <h3 class="text-pulsar text-xs font-bold uppercase tracking-wider mb-1">Pending</h3>
        <p class="text-3xl font-bold text-cosmic">{stats.pending}</p>
      </div>
    </div>

    <!-- Tracks Table -->
    <div class="glass rounded-2xl overflow-hidden border border-white/5">
      <div class="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h2 class="text-lg font-bold text-cosmic">Recent Tracks Status</h2>
        <span class="text-xs text-pulsar bg-black/20 px-2 py-1 rounded">Latest 50</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-white/5 text-xs text-pulsar uppercase tracking-wider">
              <th class="p-4 font-medium w-16">Cover</th>
              <th class="p-4 font-medium">Title</th>
              <th class="p-4 font-medium">Artist</th>
              <th class="p-4 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            {#each tracks as track (track.id)}
              <tr class="hover:bg-white/5 transition-colors group">
                <td class="p-4">
                  {#if track.imageUrl}
                    <img
                      src={track.imageUrl}
                      alt={track.title}
                      class="w-10 h-10 rounded shadow-md object-cover"
                    />
                  {:else}
                    <div
                      class="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-xl"
                    >
                      🎵
                    </div>
                  {/if}
                </td>
                <td class="p-4 text-white font-medium group-hover:text-aurora transition-colors"
                  >{track.title}</td
                >
                <td class="p-4 text-pulsar">{track.artist}</td>
                <td class="p-4 text-right">
                  <span
                    class="px-2 py-1 rounded text-xs border {getStatusColor(
                      track.status
                    )} font-medium capitalize"
                  >
                    {track.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
