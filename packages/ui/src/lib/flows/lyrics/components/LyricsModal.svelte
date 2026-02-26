<script lang="ts">
  import type { Track, Lyrics } from '@lib/types';
  import { getLyrics } from '../api';

  interface Props {
    track: Track;
    onclose: () => void;
  }

  let { track, onclose }: Props = $props();

  let lyrics = $state<Lyrics | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function fetchLyrics(force = false) {
    loading = true;
    error = null;

    try {
      lyrics = await getLyrics(track.id, { force });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch lyrics';
    } finally {
      loading = false;
    }
  }

  // Fetch on mount
  $effect(() => {
    fetchLyrics();
  });

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onclose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onclose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Backdrop -->
<div
  class="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-labelledby="lyrics-title"
  tabindex="-1"
>
  <!-- Modal -->
  <div
    class="glass rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl shadow-aurora/20"
  >
    <!-- Header -->
    <div class="p-4 border-b border-white/10 flex items-center gap-4">
      {#if track.album.imageUrl}
        <img
          src={track.album.imageUrl}
          alt={track.album.name}
          class="w-12 h-12 rounded-lg object-cover"
        />
      {/if}
      <div class="flex-grow min-w-0">
        <h2 id="lyrics-title" class="text-lg font-bold text-cosmic truncate">
          {track.title}
        </h2>
        <p class="text-sm text-pulsar truncate">
          {track.artists.map((a) => a.name).join(', ')}
        </p>
      </div>
      <button
        class="p-2 hover:bg-white/10 rounded-lg transition-colors text-pulsar hover:text-cosmic"
        onclick={onclose}
        aria-label="Close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-grow overflow-y-auto p-6">
      {#if loading}
        <div class="flex flex-col items-center justify-center py-12 text-pulsar">
          <div
            class="w-8 h-8 border-2 border-aurora border-t-transparent rounded-full animate-spin mb-4"
          ></div>
          <p>Fetching lyrics...</p>
        </div>
      {:else if error}
        <div class="text-center py-12">
          <p class="text-red-400 mb-2">Failed to load lyrics</p>
          <p class="text-pulsar text-sm">{error}</p>
          <button
            onclick={() => fetchLyrics(true)}
            class="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-cosmic transition-colors"
          >
            Retry
          </button>
        </div>
      {:else if lyrics?.status === 'not_found'}
        <div class="text-center py-12">
          <p class="text-pulsar text-lg mb-2">No lyrics found</p>
          <p class="text-cosmic/80 text-sm mb-6">
            Lyrics are not available for this track.<br />
            It might be an instrumental song.
          </p>
          <button
            onclick={() => fetchLyrics(true)}
            class="px-4 py-2 bg-aurora/10 hover:bg-aurora/20 text-aurora rounded-lg text-sm font-medium transition-colors border border-aurora/30 hover:shadow-lg hover:shadow-aurora/10"
          >
            Retry Retrieval
          </button>
        </div>
      {:else if lyrics?.plainLyrics}
        <pre
          class="whitespace-pre-wrap font-sans text-cosmic/90 leading-relaxed">{lyrics.plainLyrics}</pre>
      {:else}
        <p class="text-pulsar text-center py-12">No lyrics content available.</p>
      {/if}
    </div>
  </div>
</div>
