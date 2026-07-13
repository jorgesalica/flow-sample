<script lang="ts">
  import type { Annotation, CanvasAnalysis } from '@flows/shared';
  import LayerToggle from '@components/canvas/LayerToggle.svelte';
  import TokenRenderer from '@components/canvas/TokenRenderer.svelte';
  import TokenTooltip from '@components/canvas/TokenTooltip.svelte';
  import { FlowLayout, IconButton, Panel } from '@lib/components';
  import CanvasEditor from './CanvasEditor.svelte';
  import CanvasSidebar from './CanvasSidebar.svelte';
  import { canvasStore } from './stores.svelte';

  let { canvases = [] }: { canvases?: CanvasAnalysis[] } = $props();

  $effect(() => canvasStore.setCanvases(canvases));

  let isMobileMenuOpen = $state(false);
  let activeLayers: string[] = $state(['meaning']);
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let tooltipVisible = $state(false);
  let tooltipAnnotations: Annotation[] = $state([]);

  function handleTokenHover(detail: { tokenId: string; el: HTMLElement } | null): void {
    const analysis = canvasStore.activeCanvas;
    if (!detail || !analysis) {
      tooltipVisible = false;
      return;
    }

    const annotations = analysis.annotations.filter(
      (annotation) =>
        annotation.tokenId === detail.tokenId && activeLayers.includes(annotation.layerId)
    );
    if (annotations.length === 0) {
      tooltipVisible = false;
      return;
    }

    const rect = detail.el.getBoundingClientRect();
    tooltipX = rect.left + rect.width / 2;
    tooltipY = rect.bottom + 10;
    tooltipAnnotations = annotations;
    tooltipVisible = true;
  }
</script>

<FlowLayout fullBleed>
  <div class="canvas-flow">
    <CanvasSidebar bind:isMobileMenuOpen />

    <section class="canvas-workspace" aria-label="Canvas workspace">
      <header class="canvas-toolbar">
        <div class="canvas-toolbar__identity">
          <IconButton
            class="canvas-toolbar__menu"
            label="Toggle canvas menu"
            onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-width="1.5" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </IconButton>

          {#if canvasStore.activeCanvas}
            <div>
              <h1>{canvasStore.activeCanvas.meta?.title || 'Untitled'}</h1>
              <span>{canvasStore.activeCanvas.meta?.author || 'User'}</span>
            </div>
          {:else}
            <h1>Text Analysis Canvas</h1>
          {/if}
        </div>

        {#if canvasStore.activeCanvas}
          <LayerToggle layers={canvasStore.activeCanvas.layers} bind:activeLayers />
        {/if}
      </header>

      <div class="canvas-workspace__content">
        {#if canvasStore.activeCanvas}
          <div class="canvas-document">
            {#if canvasStore.activeCanvas.meta?.summary}
              <Panel element="section" ariaLabel="Overview">
                <h2>Overview</h2>
                <p>{canvasStore.activeCanvas.meta.summary}</p>

                <dl class="canvas-overview__meta">
                  {#if canvasStore.activeCanvas.meta.theme}
                    <div>
                      <dt>Theme</dt>
                      <dd>{canvasStore.activeCanvas.meta.theme}</dd>
                    </div>
                  {/if}
                  {#if canvasStore.activeCanvas.meta.tone}
                    <div>
                      <dt>Tone</dt>
                      <dd>{canvasStore.activeCanvas.meta.tone}</dd>
                    </div>
                  {/if}
                </dl>
              </Panel>
            {/if}

            <TokenRenderer
              tokenAst={canvasStore.activeCanvas.tokenAst}
              annotations={canvasStore.activeCanvas.annotations}
              {activeLayers}
              ontokenhover={handleTokenHover}
            />

            <TokenTooltip
              annotations={tooltipAnnotations}
              x={tooltipX}
              y={tooltipY}
              visible={tooltipVisible}
            />
          </div>
        {:else}
          <CanvasEditor />
        {/if}
      </div>
    </section>

    {#if isMobileMenuOpen}
      <button
        class="canvas-overlay"
        aria-label="Close canvas menu"
        onclick={() => (isMobileMenuOpen = false)}
      ></button>
    {/if}
  </div>
</FlowLayout>

<style>
  .canvas-flow {
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
    min-width: 0;
    overflow: hidden;
    background: var(--ui-background);
    color: var(--ui-text);
  }

  .canvas-workspace {
    position: relative;
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
  }

  .canvas-toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    min-height: 3.5rem;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-nav);
  }

  .canvas-toolbar__identity {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.75rem;
  }

  .canvas-toolbar__identity div {
    min-width: 0;
  }

  .canvas-toolbar h1 {
    margin: 0;
    overflow: hidden;
    font-size: 0.875rem;
    letter-spacing: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .canvas-toolbar span {
    color: var(--ui-text-muted);
    font-size: 0.75rem;
  }

  .canvas-toolbar__identity :global(.canvas-toolbar__menu) {
    display: none;
  }

  .canvas-toolbar svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .canvas-workspace__content {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
  }

  .canvas-document {
    position: relative;
    width: min(56rem, 100%);
    min-height: 100%;
    margin: 0 auto;
    padding: 2rem;
  }

  .canvas-document :global(.ui-panel) {
    margin-bottom: 2rem;
  }

  .canvas-document h2 {
    margin: 0 0 0.5rem;
    font-size: 1.125rem;
    letter-spacing: 0;
  }

  .canvas-document p {
    margin: 0;
    color: var(--ui-text-muted);
  }

  .canvas-overview__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin: 1rem 0 0;
    padding-top: 1rem;
    border-top: 1px solid var(--ui-border);
  }

  .canvas-overview__meta div {
    display: grid;
    gap: 0.25rem;
  }

  .canvas-overview__meta dt {
    color: var(--ui-text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  .canvas-overview__meta dd {
    margin: 0;
    color: var(--ui-accent);
    font-size: 0.875rem;
  }

  .canvas-overlay {
    position: fixed;
    inset: var(--app-nav-height) 0 0;
    z-index: 15;
    display: none;
    border: 0;
    background: var(--ui-overlay);
  }

  @media (max-width: 48rem) {
    .canvas-toolbar__identity :global(.canvas-toolbar__menu),
    .canvas-overlay {
      display: grid;
    }

    .canvas-document {
      padding: 1rem;
    }
  }
</style>
