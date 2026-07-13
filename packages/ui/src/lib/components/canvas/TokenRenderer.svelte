<script lang="ts">
  import type { TokenAST, Annotation } from '@flows/shared';

  interface Props {
    tokenAst: TokenAST;
    annotations?: Annotation[];
    activeLayers?: string[];
    /** Fired with the hovered token (or null on leave); replaces the old `tokenhover` event. */
    ontokenhover?: (detail: { tokenId: string; el: HTMLElement } | null) => void;
  }

  let { tokenAst, annotations = [], activeLayers = [], ontokenhover }: Props = $props();

  // Group annotations by token ID for O(1) lookup during render
  const annotationsByToken = $derived(
    annotations.reduce(
      (acc, ann) => {
        if (!acc[ann.tokenId]) acc[ann.tokenId] = [];
        acc[ann.tokenId].push(ann);
        return acc;
      },
      {} as Record<string, Annotation[]>
    )
  );

  // Filter annotations for a specific token that belong to active layers
  function getActiveAnnotations(tokenId: string, currentActiveLayers: string[]): Annotation[] {
    const tokenAnns = annotationsByToken[tokenId] || [];
    return tokenAnns.filter((ann: Annotation) => currentActiveLayers.includes(ann.layerId));
  }

  function hasMeaning(anns: Annotation[]): boolean {
    return anns.some((a) => a.layerId === 'meaning');
  }

  // Line-level meaning highlight: track which line group is hovered
  let hoveredLineId = $state<string | null>(null);

  function handleTokenMouseEnter(
    tokenId: string,
    anns: Annotation[],
    el: HTMLElement,
    lineId: string
  ) {
    // If this token has a meaning annotation, highlight its whole line
    if (hasMeaning(anns) && activeLayers.includes('meaning')) {
      hoveredLineId = lineId;
    }

    if (anns.length > 0) {
      ontokenhover?.({ tokenId, el });
    }
  }

  function handleTokenMouseLeave() {
    hoveredLineId = null;
    ontokenhover?.(null);
  }

  function getTokenLabel(text: string, anns: Annotation[]): string | undefined {
    if (anns.length === 0) return undefined;
    return `${text}. ${anns.map((ann) => `${ann.label}: ${ann.detail}`).join('. ')}`;
  }

  function abbreviateVocal(label: string): string {
    return label.charAt(0).toUpperCase();
  }
</script>

{#snippet tokenContent(text: string, displayAnns: Annotation[])}
  {#if displayAnns.length > 0}
    <span class="badge-row">
      {#each displayAnns as ann, i (`${ann.layerId}_${i}`)}
        <span class="layer-badge layer-{ann.layerId}">
          {ann.layerId === 'vocal' ? abbreviateVocal(ann.label) : ann.label}
        </span>
        {#if i < displayAnns.length - 1}
          <span class="badge-separator" aria-hidden="true">&middot;</span>
        {/if}
      {/each}
    </span>
  {/if}

  <span class="token-text">{text}</span>
{/snippet}

<div class="canvas-renderer" class:has-layers={activeLayers.length > 0}>
  {#each tokenAst.sections as section (section.id)}
    <section class="canvas-section">
      <header class="section-header">
        <span class="section-type">[ {section.type} ]</span>
      </header>

      <div class="section-content">
        {#each section.lines as line, lineIndex (`${section.id}_${lineIndex}`)}
          {@const lineId = `${section.id}_${lineIndex}`}
          {@const lineMeaningAnns = Array.from(
            new Map(
              line
                .flatMap((t) =>
                  getActiveAnnotations(t.id, activeLayers).filter((a) => a.layerId === 'meaning')
                )
                .map((a) => [a.detail, a])
            ).values()
          )}
          {@const lineHasMeaning = lineMeaningAnns.length > 0 && activeLayers.includes('meaning')}

          <div class="canvas-line" class:line-highlighted={hoveredLineId === lineId}>
            {#each line as token (token.id)}
              {@const activeAnns = getActiveAnnotations(token.id, activeLayers)}
              {@const displayAnns = activeAnns.filter((a) => a.layerId !== 'meaning')}
              {@const tokenHoverAnns = [...displayAnns, ...lineMeaningAnns]}

              {#if tokenHoverAnns.length > 0}
                <button
                  type="button"
                  class="token"
                  class:annotated={displayAnns.length > 0}
                  class:has-meaning={lineHasMeaning}
                  data-id={token.id}
                  aria-label={getTokenLabel(token.text, tokenHoverAnns)}
                  onmouseenter={(event) =>
                    handleTokenMouseEnter(token.id, tokenHoverAnns, event.currentTarget, lineId)}
                  onmouseleave={handleTokenMouseLeave}
                  onfocus={(event) =>
                    handleTokenMouseEnter(token.id, tokenHoverAnns, event.currentTarget, lineId)}
                  onblur={handleTokenMouseLeave}
                  onclick={(event) =>
                    handleTokenMouseEnter(token.id, tokenHoverAnns, event.currentTarget, lineId)}
                >
                  {@render tokenContent(token.text, displayAnns)}
                </button>
              {:else}
                <span class="token" class:has-meaning={lineHasMeaning} data-id={token.id}>
                  {@render tokenContent(token.text, displayAnns)}
                </span>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .canvas-renderer {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    font-family: var(--font-mono);
    color: var(--ui-text);
    padding: 1rem;
  }

  .canvas-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-header {
    border-bottom: 1px solid var(--ui-border);
    padding-bottom: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .section-type {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0;
    font-weight: 800;
    color: var(--ui-accent);
    background: var(--ui-surface-subtle);
    padding: 0.3rem 0.85rem;
    border-radius: 1rem;
    border: 1px solid var(--ui-border);
    display: inline-block;
  }

  .section-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .canvas-line {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.4rem;
    row-gap: 0.5rem;
    border-radius: 4px;
    transition: background 0.2s;
    padding: 0.2rem 0.5rem;
    margin-left: -0.5rem;
    align-items: flex-end; /* Align to bottom baseline */
  }

  .canvas-line.line-highlighted {
    background: color-mix(in srgb, var(--ui-accent) 10%, transparent);
    box-shadow: inset 2px 0 0 var(--ui-accent);
  }

  /* ── Token layout: flex column ── */
  .token {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end; /* Push text to bottom */
    cursor: default;
    border: 0;
    outline: 0;
    background: transparent;
    color: inherit;
    padding: 0;
    font: inherit;
    transition: color 0.2s;
    gap: 0.15rem;
  }

  .token.annotated {
    cursor: pointer;
    color: var(--ui-accent);
  }

  .token:focus-visible {
    border-radius: 0.25rem;
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }

  .token-text {
    z-index: 1;
    line-height: 1.4;
  }

  /* ── Badge row: inline below text ── */
  .badge-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.2rem;
    min-height: 0.9rem;
  }

  .badge-separator {
    color: var(--ui-text-muted);
    font-size: 0.6rem;
  }

  .layer-badge {
    font-size: 0.7rem;
    font-weight: 700;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0.9;
    line-height: 1;
  }

  .layer-chords {
    color: var(--ui-success);
    font-size: 0.75rem;
  }

  .layer-vocal {
    font-size: 0.65rem;
    color: var(--ui-warning);
  }

  .layer-production {
    color: var(--ui-chart-4);
    font-size: 0.65rem;
  }

  /* ── Meaning: visual-only (underline) ── */
  .token.has-meaning .token-text {
    border-bottom: 2px dashed color-mix(in srgb, var(--ui-accent) 45%, transparent);
    padding-bottom: 2px;
  }

  .canvas-line.line-highlighted .token.has-meaning .token-text {
    border-bottom-color: var(--ui-accent);
  }
</style>
