<script lang="ts">
  import { untrack } from 'svelte';
  import type { LyricsStats, LyricsStatus, Track } from '@flows/shared';
  import type { LyricsPageData, LyricsTrackRow } from '../../../routes/lyrics/+page';
  import { getLyricsStats, getLyricsLibrary, fetchAllLyrics, getLyrics } from './api';
  import { toast } from '@lib/toast';
  import { FlowLayout } from '@lib/components';
  import LyricsModal from './components/LyricsModal.svelte';
  import LyricsCanvas from './LyricsCanvas.svelte';

  // Initial data comes from the universal loader (src/routes/lyrics/+page.ts).
  let { data }: { data: LyricsPageData } = $props();

  const LIMIT = 50;

  // Seed component-local state once from the loaded data; `untrack` makes the
  // one-time capture explicit (subsequent interactions own this state).
  let stats = $state<LyricsStats | null>(untrack(() => data.stats));
  let canvasTrackId = $state<string | null>(untrack(() => data.canvasTrackId));
  let tracks = $state<LyricsTrackRow[]>(untrack(() => data.tracks));
  let loading = $state(false);
  let error = $state<string | null>(untrack(() => data.error));
  let isFetchingLyrics = $state(false);
  let isRetryingFailed = $state(false);
  let selectedTrack = $state<Track | null>(null);

  // Filter state
  let currentFilter = $state<string>(''); // '' = all
  let page = $state(1);
  let hasMore = $state(untrack(() => data.tracks.length) >= LIMIT);

  // Load data
  async function loadData(reset = false) {
    if (reset) {
      page = 1;
      tracks = [];
      hasMore = true;
      loading = true;
    } else {
      loading = true; // Show loading indicator while appending
    }

    try {
      // Cast the filter string to the expected type (or undefined if empty)
      const filterArg = currentFilter ? (currentFilter as LyricsStatus) : undefined;

      const [statsData, newTracks] = await Promise.all([
        getLyricsStats(), // Stats are always global
        getLyricsLibrary(page, LIMIT, filterArg),
      ]);

      stats = statsData;

      if (newTracks.length < LIMIT) {
        hasMore = false;
      }

      if (reset) {
        tracks = newTracks;
      } else {
        tracks = [...tracks, ...newTracks];
      }

      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  function handleFilterChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    currentFilter = target.value;
    loadData(true);
  }

  function handleLoadMore() {
    if (!loading && hasMore) {
      page++;
      loadData(false);
    }
  }

  function refreshAll() {
    return loadData(true);
  }

  // Sync state to URL
  $effect(() => {
    const basePath = window.location.pathname;
    if (canvasTrackId) {
      window.history.replaceState(null, '', `${basePath}?canvasTrackId=${canvasTrackId}`);
    } else if (window.location.search.includes('canvasTrackId')) {
      window.history.replaceState(null, '', basePath);
    }
  });

  async function handleFetchAllLyrics(retryFailed = false) {
    if (retryFailed) {
      isRetryingFailed = true;
    } else {
      isFetchingLyrics = true;
    }

    // Slight delay to ensure UI updates before toast
    await new Promise((r) => setTimeout(r, 50));

    const toastId = toast.loading(
      retryFailed ? 'Retrying lyrics for failed tracks...' : 'Fetching lyrics for pending tracks...'
    );

    try {
      const result = await fetchAllLyrics(retryFailed);
      toast.dismiss(toastId);

      if (result.processed === 0) {
        toast.success('No tracks needed processing.');
      } else {
        const message = `Sync Complete: ${result.found} found, ${result.notFound} not available.`;
        if (result.errors > 0) {
          toast.error(`${message} (${result.errors} errors)`);
        } else {
          toast.success(message);
        }
      }

      // Refresh data to show updates
      await refreshAll();
    } catch (e) {
      toast.dismiss(toastId);
      toast.error('Failed to fetch lyrics batch');
      console.error(e);
    } finally {
      isFetchingLyrics = false;
      isRetryingFailed = false;
    }
  }

  async function handleIndividualRetry(trackId: string, e: Event) {
    e.stopPropagation();
    const toastId = toast.loading('Fetching...');
    try {
      await getLyrics(trackId, { force: true });
      toast.dismiss(toastId);
      toast.success('Fetch complete');

      tracks = tracks.map((t) => (t.id === trackId ? { ...t, status: 'found' } : t));
      stats = await getLyricsStats();
    } catch {
      toast.dismiss(toastId);
      toast.error('Fetch failed or not found');

      tracks = tracks.map((t) => (t.id === trackId ? { ...t, status: 'not_found' } : t));
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

<FlowLayout>
  <div class="h-full w-full overflow-hidden flex flex-col pb-8">
    <!-- Header -->
    <header
      class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
    >
      <div>
        <h1 class="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <span>🎤</span>
          <span class="text-cosmic">Lyrics Dashboard</span>
        </h1>
        <p class="text-pulsar mt-2 max-w-xl">
          Manage lyrics availability. To read lyrics, visit the
          <a href="/spotify" class="text-aurora hover:underline">Spotify Flow</a>.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3">
        <!-- Retry Failed Button -->
        <button
          onclick={() => handleFetchAllLyrics(true)}
          disabled={isRetryingFailed || isFetchingLyrics || loading}
          class="btn-secondary flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2"
        >
          {#if isRetryingFailed}
            <div
              class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"
            ></div>
            Retrying...
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              /></svg
            >
            Retry Failed
          {/if}
        </button>

        <!-- Fetch Missing Button -->
        <button
          onclick={() => handleFetchAllLyrics(false)}
          disabled={isRetryingFailed || isFetchingLyrics || loading}
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
            Fetch Missing
          {/if}
        </button>
      </div>
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
    {:else if canvasTrackId}
      <div class="flex flex-col h-full">
        <div class="p-4 border-b border-white/5">
          <button
            class="text-pulsar hover:text-white transition-colors flex items-center gap-2"
            onclick={() => (canvasTrackId = null)}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              /></svg
            >
            Back to Dashboard
          </button>
        </div>
        <div class="flex-grow overflow-hidden relative">
          <LyricsCanvas trackId={canvasTrackId} />
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
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-bold text-cosmic">Recent Tracks</h2>

            <!-- Filter Control -->
            <div class="relative">
              <select
                value={currentFilter}
                onchange={handleFilterChange}
                class="appearance-none bg-black/20 border border-white/10 text-pulsar text-xs rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-aurora cursor-pointer hover:bg-black/30 transition-colors"
              >
                <option value="">All Status</option>
                <option value="found">✅ Found</option>
                <option value="not_found">❌ Not Found</option>
                <option value="pending">⏳ Pending</option>
              </select>
              <div
                class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/30"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  /></svg
                >
              </div>
            </div>
          </div>

          <span class="text-xs text-pulsar bg-black/20 px-2 py-1 rounded">
            {tracks.length} loaded
          </span>
        </div>

        {#if tracks.length === 0}
          <!-- Empty State -->
          <div class="flex flex-col items-center justify-center py-16 text-pulsar/50">
            <div class="text-4xl mb-4">📭</div>
            <p class="text-lg font-medium">No tracks found</p>
            <p class="text-xs mt-1">Try changing the filter or fetching more lyrics.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-white/5 text-xs text-pulsar uppercase tracking-wider">
                  <th class="p-4 font-medium w-16">Cover</th>
                  <th class="p-4 font-medium">Title</th>
                  <th class="p-4 font-medium">Artist</th>
                  <th class="p-4 font-medium text-right">Status</th>
                  <th class="p-4 font-medium w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                {#each tracks as track (track.id)}
                  <tr
                    class="hover:bg-white/5 transition-colors group {track.status === 'found'
                      ? 'cursor-pointer'
                      : ''}"
                    onclick={() => {
                      if (track.status === 'found') {
                        selectedTrack = {
                          id: track.id,
                          title: track.title,
                          artists: [{ id: '', name: track.artist, genres: [] }],
                          album: {
                            id: '',
                            name: '',
                            releaseDate: '',
                            imageUrl: track.imageUrl ?? undefined,
                          },
                          addedAt: '',
                          durationMs: 0,
                        };
                      }
                    }}
                  >
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
                    <td class="p-4 text-right">
                      <div class="flex justify-end gap-2">
                        {#if track.status === 'found'}
                          <button
                            class="text-aurora hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                            title="View Lyrics"
                            onclick={(e) => {
                              e.stopPropagation();
                              selectedTrack = {
                                id: track.id,
                                title: track.title,
                                artists: [{ id: '', name: track.artist, genres: [] }],
                                album: {
                                  id: '',
                                  name: '',
                                  releaseDate: '',
                                  imageUrl: track.imageUrl ?? undefined,
                                },
                                addedAt: '',
                                durationMs: 0,
                              };
                            }}
                          >
                            <svg
                              class="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              /></svg
                            >
                          </button>
                          <button
                            class="text-cosmic hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                            title="Open Canvas"
                            onclick={(e) => {
                              e.stopPropagation();
                              canvasTrackId = track.id;
                            }}
                          >
                            <svg
                              class="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              /></svg
                            >
                          </button>
                        {/if}
                        {#if track.status === 'not_found' || track.status === 'pending'}
                          <button
                            class="text-pulsar hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                            title={track.status === 'not_found' ? 'Retry Fetching' : 'Fetch Lyrics'}
                            onclick={(e) => handleIndividualRetry(track.id, e)}
                          >
                            <svg
                              class="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d={track.status === 'not_found'
                                  ? 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                  : 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'}
                              /></svg
                            >
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        <!-- Load More Action -->
        {#if hasMore && tracks.length > 0}
          <div class="p-4 border-t border-white/5 flex justify-center">
            <button
              onclick={handleLoadMore}
              disabled={loading}
              class="text-sm text-pulsar hover:text-white transition-colors disabled:opacity-50 py-2 px-4 rounded hover:bg-white/5"
            >
              {loading ? 'Loading more...' : 'Load More'}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</FlowLayout>

{#if selectedTrack}
  <LyricsModal track={selectedTrack} onclose={() => (selectedTrack = null)} />
{/if}
