<script lang="ts">
  import type { Track } from '@flows/shared';
  import { getLyrics, interpretLyrics } from '../api';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  interface Props {
    track: Track;
    onclose: () => void;
  }

  let { track, onclose }: Props = $props();

  let lyrics = $state<{ plainLyrics: string | null; status: string; interpretation?: string | null } | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Interpretation state
  let isInterpreting = $state(false);
  let interpretContent = $state('');
  let interpretDone = $state(false);
  let interpretError = $state<string | null>(null);
  let showInterpretation = $state(false);

  // Configure marked
  marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(text: string): string {
    const rawHtml = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml);
  }

  async function fetchLyrics(force = false) {
    loading = true;
    error = null;

    try {
      const result = await getLyrics(track.id, { force });
      lyrics = result;

      // If we have a cached interpretation, show it
      if (result.interpretation) {
        interpretContent = result.interpretation;
        interpretDone = true;
        showInterpretation = true;
      }
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

  async function handleInterpret() {
    if (isInterpreting) return;

    isInterpreting = true;
    interpretContent = '';
    interpretDone = false;
    interpretError = null;
    showInterpretation = true;

    try {
      await interpretLyrics(track.id, (event) => {
        switch (event.type) {
          case 'cached':
            interpretContent = event.interpretation;
            interpretDone = true;
            isInterpreting = false;
            break;
          case 'delta':
            interpretContent += event.delta;
            break;
          case 'done':
            interpretDone = true;
            isInterpreting = false;
            break;
          case 'error':
            interpretError = event.error;
            isInterpreting = false;
            break;
        }
      });
    } catch (e) {
      interpretError = e instanceof Error ? e.message : 'Interpretation failed';
      isInterpreting = false;
    }
  }

  function handleRegenerate() {
    // Clear cached state and re-interpret
    interpretContent = '';
    interpretDone = false;
    handleInterpret();
  }

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
    class="glass rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-aurora/20"
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

      <div class="flex items-center gap-2">
        <!-- Interpret Button -->
        {#if lyrics?.plainLyrics && !showInterpretation}
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                   bg-aurora/10 hover:bg-aurora/20 text-aurora border border-aurora/30
                   hover:shadow-lg hover:shadow-aurora/10 active:scale-95"
            onclick={handleInterpret}
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Interpret
          </button>
        {/if}

        <!-- Close Button -->
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
    </div>

    <!-- Content -->
    <div class="flex-grow overflow-y-auto p-6 space-y-6">
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
        <!-- Lyrics -->
        <pre
          class="whitespace-pre-wrap font-sans text-cosmic/90 leading-relaxed">{lyrics.plainLyrics}</pre>

        <!-- AI Interpretation Panel -->
        {#if showInterpretation}
          <div class="border-t border-white/10 pt-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-aurora" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <h3 class="text-sm font-semibold text-aurora uppercase tracking-wider">AI Interpretation</h3>
                {#if isInterpreting}
                  <div class="w-3 h-3 border-2 border-aurora border-t-transparent rounded-full animate-spin"></div>
                {/if}
              </div>
              {#if interpretDone}
                <button
                  class="text-[10px] text-pulsar hover:text-cosmic transition-colors px-2 py-0.5 rounded border border-white/10 hover:bg-white/5"
                  onclick={handleRegenerate}
                >
                  Regenerate
                </button>
              {/if}
            </div>

            {#if interpretError}
              <div class="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                {interpretError}
              </div>
            {:else if interpretContent}
              <div class="prose prose-invert prose-sm max-w-none leading-relaxed
                          prose-p:my-1.5 prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10
                          prose-code:text-aurora prose-code:before:content-[''] prose-code:after:content-['']
                          prose-headings:text-cosmic prose-strong:text-cosmic/90
                          bg-white/[0.02] rounded-xl p-4 border border-white/5">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html renderMarkdown(interpretContent)}
                {#if isInterpreting}
                  <span class="inline-block w-0.5 h-4 bg-aurora animate-pulse ml-0.5 align-text-bottom"></span>
                {/if}
              </div>
            {:else if isInterpreting}
              <div class="flex items-center gap-1.5 py-4 justify-center">
                <div class="w-2 h-2 bg-aurora rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 bg-aurora rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                <div class="w-2 h-2 bg-aurora rounded-full animate-bounce" style="animation-delay: 300ms"></div>
              </div>
            {/if}
          </div>
        {/if}
      {:else}
        <p class="text-pulsar text-center py-12">No lyrics content available.</p>
      {/if}
    </div>
  </div>
</div>
