<script lang="ts">
  import type { Track } from '@flows/shared';
  import { AsyncState, Badge, Button, ModalShell } from '@lib/components';
  import { getLyrics, interpretLyrics } from '../api';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  interface Props {
    track: Track;
    onclose: () => void;
  }

  let { track, onclose }: Props = $props();
  const artistNames = $derived(track.artists.map((artist) => artist.name).join(', '));

  let lyrics = $state<{
    plainLyrics: string | null;
    status: string;
    interpretation?: string | null;
  } | null>(null);
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
    interpretContent = '';
    interpretDone = false;
    handleInterpret();
  }
</script>

{#snippet albumArt()}
  {#if track.album.imageUrl}
    <img src={track.album.imageUrl} alt={track.album.name} class="album-art" />
  {/if}
{/snippet}

{#snippet modalActions()}
  {#if lyrics?.plainLyrics && !showInterpretation}
    <Button variant="secondary" size="sm" onclick={handleInterpret}>Interpret</Button>
  {/if}
{/snippet}

<ModalShell
  title={track.title}
  subtitle={artistNames}
  media={albumArt}
  actions={modalActions}
  size="lg"
  {onclose}
>
  <div class="lyrics-modal-content">
    {#if loading}
      <AsyncState state="loading" title="Fetching lyrics" />
    {:else if error}
      {#snippet retryAction()}
        <Button variant="danger" onclick={() => fetchLyrics(true)}>Retry</Button>
      {/snippet}
      <AsyncState
        state="error"
        title="Failed to load lyrics"
        message={error}
        action={retryAction}
      />
    {:else if lyrics?.status === 'not_found'}
      {#snippet retryRetrievalAction()}
        <Button variant="secondary" onclick={() => fetchLyrics(true)}>Retry Retrieval</Button>
      {/snippet}
      <AsyncState
        state="empty"
        title="No lyrics found"
        message="Lyrics are not available for this track. It might be an instrumental song."
        action={retryRetrievalAction}
      />
    {:else if lyrics?.plainLyrics}
      <pre class="lyrics-text">{lyrics.plainLyrics}</pre>

      {#if showInterpretation}
        <section class="interpretation-panel" aria-label="AI Interpretation">
          <header class="interpretation-header">
            <div class="interpretation-heading">
              <Badge tone={interpretError ? 'danger' : interpretDone ? 'success' : 'info'}>
                AI Interpretation
              </Badge>
              {#if isInterpreting && interpretContent}
                <span class="interpretation-status" role="status">Streaming</span>
              {/if}
            </div>
            {#if interpretDone}
              <Button variant="ghost" size="sm" onclick={handleRegenerate}>Regenerate</Button>
            {/if}
          </header>

          {#if interpretError}
            {#snippet retryInterpretationAction()}
              <Button variant="danger" size="sm" onclick={handleRegenerate}>Try Again</Button>
            {/snippet}
            <AsyncState
              state="error"
              title="Interpretation failed"
              message={interpretError}
              action={retryInterpretationAction}
            />
          {:else if interpretContent}
            <div class="interpretation-content prose prose-invert prose-sm max-w-none">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html renderMarkdown(interpretContent)}
              {#if isInterpreting}<span class="stream-cursor" aria-hidden="true"></span>{/if}
            </div>
          {:else if isInterpreting}
            <AsyncState state="loading" title="Interpreting lyrics" />
          {/if}
        </section>
      {/if}
    {:else}
      <AsyncState state="empty" title="No lyrics content available" />
    {/if}
  </div>
</ModalShell>

<style>
  .album-art {
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    object-fit: cover;
  }

  .lyrics-modal-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 1.5rem;
  }

  .lyrics-text {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--ui-text);
    font-family: inherit;
    line-height: 1.75;
    white-space: pre-wrap;
  }

  .interpretation-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--ui-border);
  }

  .interpretation-header,
  .interpretation-heading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .interpretation-header {
    justify-content: space-between;
  }

  .interpretation-status {
    color: var(--ui-text-muted);
    font-size: 0.75rem;
  }

  .interpretation-content {
    min-width: 0;
    padding: 1rem;
    overflow-wrap: anywhere;
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    background: var(--ui-surface-raised);
    line-height: 1.65;
  }

  .stream-cursor {
    display: inline-block;
    width: 0.125rem;
    height: 1rem;
    margin-left: 0.125rem;
    vertical-align: text-bottom;
    background: var(--ui-accent);
    animation: cursor-pulse 1s ease-in-out infinite;
  }

  @keyframes cursor-pulse {
    50% {
      opacity: 0.25;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stream-cursor {
      animation: none;
    }
  }

  @media (max-width: 40rem) {
    .album-art {
      width: 2.5rem;
      height: 2.5rem;
    }

    .interpretation-header {
      align-items: flex-start;
    }
  }
</style>
