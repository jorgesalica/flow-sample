<script lang="ts">
  import { untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import type { LyricsStats, LyricsStatus, Track } from '@flows/shared';
  import type { LyricsPageData, LyricsTrackRow } from '../../../routes/lyrics/+page';
  import { getLyricsStats, getLyricsLibrary, fetchAllLyrics, getLyrics } from './api';
  import { toast } from '@lib/toast';
  import { AsyncState, Badge, Button, FlowLayout, IconButton, Panel } from '@lib/components';
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

  function setCanvasTrack(trackId: string | null) {
    canvasTrackId = trackId;
    const url = new URL(window.location.href);
    if (trackId) {
      url.searchParams.set('canvasTrackId', trackId);
    } else {
      url.searchParams.delete('canvasTrackId');
    }
    replaceState(url, {});
  }

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

  function getStatusTone(status: string): 'success' | 'danger' | 'info' {
    switch (status) {
      case 'found':
        return 'success';
      case 'not_found':
        return 'danger';
      default:
        return 'info';
    }
  }
</script>

<FlowLayout>
  <div class="lyrics-flow">
    <!-- Header -->
    <header class="lyrics-header">
      <div>
        <h1 class="lyrics-title">
          <span aria-hidden="true">🎤</span>
          <span>Lyrics Dashboard</span>
        </h1>
        <p class="lyrics-subtitle">
          Manage lyrics availability. To read lyrics, visit the
          <a href="/spotify">Spotify Flow</a>.
        </p>
      </div>

      <!-- Actions -->
      <div class="lyrics-actions">
        <!-- Retry Failed Button -->
        <Button
          onclick={() => handleFetchAllLyrics(true)}
          disabled={isRetryingFailed || isFetchingLyrics || loading}
          loading={isRetryingFailed}
          variant="secondary"
        >
          {#if isRetryingFailed}
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
        </Button>

        <!-- Fetch Missing Button -->
        <Button
          onclick={() => handleFetchAllLyrics(false)}
          disabled={isRetryingFailed || isFetchingLyrics || loading}
          loading={isFetchingLyrics}
        >
          {#if isFetchingLyrics}
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
        </Button>
      </div>
    </header>

    {#if loading && !tracks.length}
      <div class="min-h-[400px] flex-grow">
        <AsyncState state="loading" title="Loading lyrics data" />
      </div>
    {:else if error}
      {#snippet retryAction()}
        <Button variant="danger" onclick={() => window.location.reload()}>Retry</Button>
      {/snippet}
      <AsyncState state="error" title="Error Loading Data" message={error} action={retryAction} />
    {:else if canvasTrackId}
      <div class="flex flex-col h-full">
        <div class="border-b border-border p-4">
          <Button variant="ghost" onclick={() => setCanvasTrack(null)}>Back to Dashboard</Button>
        </div>
        <div class="flex-grow overflow-hidden relative">
          <LyricsCanvas trackId={canvasTrackId} />
        </div>
      </div>
    {:else if stats}
      <!-- Stats Grid -->
      <div class="lyrics-stats">
        <!-- Total Tracks -->
        <Panel padding="md">
          <div class="lyrics-stat">
            <h3>Total Tracks</h3>
            <p>{stats.total}</p>
          </div>
        </Panel>

        <!-- Found -->
        <Panel padding="md">
          <div class="lyrics-stat lyrics-stat--success">
            <h3>Found</h3>
            <div>
              <p>{stats.found}</p>
              <Badge tone="success">{getPercentage(stats.found, stats.total)}</Badge>
            </div>
          </div>
        </Panel>

        <!-- Not Found -->
        <Panel padding="md">
          <div class="lyrics-stat lyrics-stat--danger">
            <h3>Not Found</h3>
            <div>
              <p>{stats.notFound}</p>
              <Badge tone="danger">{getPercentage(stats.notFound, stats.total)}</Badge>
            </div>
          </div>
        </Panel>

        <!-- Pending -->
        <Panel padding="md">
          <div class="lyrics-stat lyrics-stat--info">
            <h3>Pending</h3>
            <p>{stats.pending}</p>
          </div>
        </Panel>
      </div>

      <!-- Tracks Table -->
      <Panel padding="none">
        <div class="flex items-center justify-between border-b border-border bg-surface-subtle p-4">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-bold">Recent Tracks</h2>

            <!-- Filter Control -->
            <div class="relative">
              <label for="lyrics-status-filter" class="sr-only">Filter by lyrics status</label>
              <select
                id="lyrics-status-filter"
                value={currentFilter}
                onchange={handleFilterChange}
                class="ui-field__control ui-select py-1.5 text-xs"
              >
                <option value="">All Status</option>
                <option value="found">✅ Found</option>
                <option value="not_found">❌ Not Found</option>
                <option value="pending">⏳ Pending</option>
              </select>
            </div>
          </div>

          <Badge tone="info">{tracks.length} loaded</Badge>
        </div>

        {#if tracks.length === 0}
          <AsyncState
            state="empty"
            title="No tracks found"
            message="Try changing the filter or fetching more lyrics."
          />
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-border text-xs uppercase text-muted">
                  <th class="p-4 font-medium w-16">Cover</th>
                  <th class="p-4 font-medium">Title</th>
                  <th class="p-4 font-medium">Artist</th>
                  <th class="p-4 font-medium text-right">Status</th>
                  <th class="p-4 font-medium w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                {#each tracks as track (track.id)}
                  <tr
                    class="group transition-colors hover:bg-surface-raised {track.status === 'found'
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
                          class="flex h-10 w-10 items-center justify-center rounded bg-surface-raised text-xl"
                        >
                          🎵
                        </div>
                      {/if}
                    </td>
                    <td class="p-4 font-medium transition-colors group-hover:text-accent"
                      >{track.title}</td
                    >
                    <td class="p-4 text-muted">{track.artist}</td>
                    <td class="p-4 text-right">
                      <Badge tone={getStatusTone(track.status)}>
                        {track.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td class="p-4 text-right">
                      <div class="flex justify-end gap-2">
                        {#if track.status === 'found'}
                          <IconButton
                            label="View Lyrics"
                            size="sm"
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
                          </IconButton>
                          <IconButton
                            label="Open Canvas"
                            size="sm"
                            onclick={(e) => {
                              e.stopPropagation();
                              setCanvasTrack(track.id);
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
                          </IconButton>
                        {/if}
                        {#if track.status === 'not_found' || track.status === 'pending'}
                          <IconButton
                            label={track.status === 'not_found' ? 'Retry Fetching' : 'Fetch Lyrics'}
                            size="sm"
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
                          </IconButton>
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
          <div class="flex justify-center border-t border-border p-4">
            <Button onclick={handleLoadMore} disabled={loading} {loading} variant="secondary">
              {loading ? 'Loading more...' : 'Load More'}
            </Button>
          </div>
        {/if}
      </Panel>
    {/if}
  </div>
</FlowLayout>

{#if selectedTrack}
  <LyricsModal track={selectedTrack} onclose={() => (selectedTrack = null)} />
{/if}

<style>
  .lyrics-flow {
    display: flex;
    width: 100%;
    height: 100%;
    min-width: 0;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: 2rem;
  }

  .lyrics-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .lyrics-title {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    font-size: 2.25rem;
    letter-spacing: 0;
  }

  .lyrics-subtitle {
    max-width: 36rem;
    margin: 0.5rem 0 0;
    color: var(--ui-text-muted);
  }

  .lyrics-subtitle a {
    color: var(--ui-accent);
  }

  .lyrics-subtitle a:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }

  .lyrics-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .lyrics-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .lyrics-stat {
    display: grid;
    gap: 0.5rem;
    border-left: 3px solid var(--ui-border);
    padding-left: 0.75rem;
  }

  .lyrics-stat--success {
    border-left-color: var(--ui-success);
  }

  .lyrics-stat--danger {
    border-left-color: var(--ui-danger);
  }

  .lyrics-stat--info {
    border-left-color: var(--ui-accent);
  }

  .lyrics-stat h3 {
    margin: 0;
    color: var(--ui-text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  .lyrics-stat > div {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .lyrics-stat p {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
  }

  @media (max-width: 48rem) {
    .lyrics-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .lyrics-title {
      font-size: 1.75rem;
    }

    .lyrics-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 30rem) {
    .lyrics-actions :global(.ui-button) {
      flex: 1 1 10rem;
    }

    .lyrics-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
