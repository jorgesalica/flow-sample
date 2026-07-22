<script lang="ts">
  import { onMount } from 'svelte';
  import { getCanvasAnalysis, analyzeCanvas } from './canvas-api';
  import { getLyrics, interpretLyrics } from './api';
  import type { CanvasAnalysis, Annotation, LyricsCanvasSource } from '@flows/shared';
  import TokenRenderer from '@components/canvas/TokenRenderer.svelte';
  import LayerToggle from '@components/canvas/LayerToggle.svelte';
  import TokenTooltip from '@components/canvas/TokenTooltip.svelte';
  import { AsyncState, Badge, Button } from '@lib/components';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  let { trackId }: { trackId: string } = $props();

  let loading = $state(true);
  let analyzing = $state(false);
  let error = $state<string | null>(null);

  let analysis = $state<CanvasAnalysis | null>(null);
  let statusInfo = $state<LyricsCanvasSource | null>(null);

  // UI State
  let activeLayers = $state<string[]>(['chords', 'vocal', 'meaning']);

  // Tooltip State
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let tooltipVisible = $state(false);
  let tooltipAnnotations = $state<Annotation[]>([]);

  // Interpretation State
  let interpretation = $state<string | null>(null);
  let isInterpreting = $state(false);

  marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(text: string): string {
    const rawHtml = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml);
  }

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    error = null;
    try {
      const [result, lyricsResult] = await Promise.all([
        getCanvasAnalysis(trackId),
        getLyrics(trackId).catch(() => null),
      ]);

      if (lyricsResult?.interpretation) {
        interpretation = lyricsResult.interpretation;
      }

      if ('needsAnalysis' in result) {
        statusInfo = result.source;
      } else {
        analysis = result;
      }
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function handleAnalyze() {
    analyzing = true;
    error = null;
    try {
      analysis = await analyzeCanvas(trackId);

      // Auto-generate the overarching meaning if it doesn't exist
      if (!interpretation && !isInterpreting) {
        handleGenerateMeaning(); // fire and forget (streams into UI)
      }
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      analyzing = false;
    }
  }

  async function handleGenerateMeaning() {
    if (isInterpreting) return;
    isInterpreting = true;
    interpretation = '';

    try {
      await interpretLyrics(trackId, (event) => {
        switch (event.type) {
          case 'cached':
            interpretation = event.interpretation;
            isInterpreting = false;
            break;
          case 'delta':
            interpretation += event.delta;
            break;
          case 'done':
          case 'error':
            isInterpreting = false;
            break;
        }
      });
    } catch (e) {
      console.error('Interpretation failed:', e);
      isInterpreting = false;
    }
  }

  function handleTokenHover(detail: { tokenId: string; el: HTMLElement } | null) {
    if (!detail || !analysis) {
      tooltipVisible = false;
      return;
    }

    const { tokenId, el } = detail;

    // Find active annotations for this token
    const anns = analysis.annotations.filter(
      (a) => a.tokenId === tokenId && activeLayers.includes(a.layerId)
    );

    if (anns.length > 0) {
      const rect = el.getBoundingClientRect();
      tooltipX = rect.left + rect.width / 2;
      tooltipY = rect.bottom + 10;
      tooltipAnnotations = anns;
      tooltipVisible = true;
    } else {
      tooltipVisible = false;
    }
  }
</script>

<div class="canvas-container">
  {#if loading}
    <div class="center-state">
      <AsyncState state="loading" title="Loading canvas" />
    </div>
  {:else if error}
    {#snippet retryAction()}
      <Button variant="danger" onclick={loadData}>Retry</Button>
    {/snippet}
    <div class="center-state">
      <AsyncState state="error" title="Canvas unavailable" message={error} action={retryAction} />
    </div>
  {:else if !analysis && statusInfo}
    <div class="center-state empty">
      {#if statusInfo.imageUrl}
        <img src={statusInfo.imageUrl} alt="Album Art" class="album-art" />
      {/if}
      <h2>{statusInfo.title}</h2>
      <p class="author">{statusInfo.author}</p>

      <div class="actions">
        <p class="description">Generate a musical analysis for this track using AI.</p>
        <Button onclick={handleAnalyze} loading={analyzing}>
          {analyzing ? 'Analyzing Lyrics... (This may take a minute)' : 'Generate Analysis'}
        </Button>
      </div>
    </div>
  {:else if analysis}
    <header class="canvas-header">
      <div class="header-content">
        <div class="title-area">
          <h1>Canvas Analysis</h1>
          {#if analysis.meta}
            <div class="meta-tags">
              {#if analysis.meta.key}
                <Badge tone="info">Key: {analysis.meta.key}</Badge>
              {/if}
              {#if analysis.meta.bpm}
                <Badge tone="neutral">{analysis.meta.bpm} BPM</Badge>
              {/if}
              {#if analysis.meta.mood}
                <Badge tone="success">Mood: {analysis.meta.mood}</Badge>
              {/if}
            </div>
          {/if}
        </div>

        <div class="controls">
          <LayerToggle layers={analysis.layers} bind:activeLayers />
          <Button onclick={handleAnalyze} loading={analyzing} size="sm" title="Regenerate Analysis">
            {analyzing ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </div>
      </div>
    </header>

    <main class="canvas-layout">
      <div class="canvas-main">
        <TokenRenderer
          tokenAst={analysis.tokenAst}
          annotations={analysis.annotations}
          {activeLayers}
          ontokenhover={handleTokenHover}
        />
      </div>

      <aside class="canvas-sidebar">
        <div class="sidebar-header">
          <h3>Song Meaning</h3>
        </div>

        <div class="sidebar-content">
          {#if interpretation}
            <div class="prose prose-invert prose-sm">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html renderMarkdown(interpretation)}
              {#if isInterpreting}
                <span
                  class="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent align-text-bottom"
                ></span>
              {/if}
            </div>
          {:else}
            <div class="empty-meaning">
              <p>No overarching meaning analysis found.</p>
              <Button
                variant="secondary"
                size="sm"
                class="meaning-action"
                onclick={handleGenerateMeaning}
                loading={isInterpreting}
              >
                {isInterpreting ? 'Generating...' : 'Generate Meaning'}
              </Button>
            </div>
          {/if}
        </div>
      </aside>
    </main>

    <TokenTooltip
      annotations={tooltipAnnotations}
      layers={analysis.layers}
      x={tooltipX}
      y={tooltipY}
      visible={tooltipVisible}
    />
  {/if}
</div>

<style>
  .canvas-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--ui-background);
    color: var(--ui-text);
    overflow-y: auto;
  }

  .center-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1.5rem;
    text-align: center;
    padding: 2rem;
  }

  .album-art {
    width: 7.5rem;
    height: 7.5rem;
    border-radius: 0.5rem;
    box-shadow: var(--ui-shadow);
  }

  h2 {
    font-size: 2rem;
    margin: 0;
    color: var(--ui-accent);
    letter-spacing: 0;
  }

  .author {
    font-size: 1.25rem;
    color: var(--ui-text);
    margin: 0;
  }

  .description {
    color: var(--ui-text-muted);
    max-width: 25rem;
    line-height: 1.5;
  }

  .actions {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .canvas-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--ui-nav);
    border-bottom: 1px solid var(--ui-border);
    padding: 1.5rem 2rem;
  }

  .header-content {
    max-width: 62.5rem;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .controls {
    display: flex;
    min-width: 0;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .title-area h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
  }

  .meta-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .canvas-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    max-width: 87.5rem;
    margin: 0 auto;
    padding: 2rem;
    width: 100%;
    align-items: flex-start;
  }

  .canvas-main {
    width: 100%;
    min-width: 0;
  }

  .canvas-sidebar {
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    overflow: hidden;
    position: sticky;
    top: 7.5rem;
  }

  .sidebar-header {
    background: var(--ui-surface-raised);
    border-bottom: 1px solid var(--ui-border);
    padding: 1rem 1.5rem;
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0;
    color: var(--ui-accent);
  }

  .sidebar-content {
    padding: 1.5rem;
    max-height: calc(100vh - 12.5rem);
    overflow-y: auto;
  }

  .empty-meaning {
    text-align: center;
    color: var(--ui-text-muted);
    padding: 2rem 0;
  }

  :global(.meaning-action) {
    margin-top: 1rem;
  }

  @media (max-width: 56.25rem) {
    .canvas-header {
      padding: 1rem;
    }

    .header-content,
    .controls {
      width: 100%;
    }

    .controls {
      align-items: flex-start;
      flex-direction: column;
    }

    .canvas-layout {
      grid-template-columns: minmax(0, 1fr);
      gap: 1rem;
      padding: 1rem;
    }

    .canvas-sidebar {
      position: static;
    }

    .sidebar-content {
      max-height: none;
    }
  }
</style>
