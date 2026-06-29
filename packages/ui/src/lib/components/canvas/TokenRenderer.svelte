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

  function abbreviateVocal(label: string): string {
    return label.charAt(0).toUpperCase();
  }
</script>

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

              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <span
                class="token"
                class:annotated={displayAnns.length > 0}
                class:has-meaning={lineHasMeaning}
                data-id={token.id}
                onmouseenter={(e) =>
                  handleTokenMouseEnter(token.id, tokenHoverAnns, e.currentTarget, lineId)}
                onmouseleave={handleTokenMouseLeave}
              >
                <!-- All badges inline ABOVE the text -->
                {#if displayAnns.length > 0}
                  <span class="badge-row">
                    {#each displayAnns as ann, i (`${ann.layerId}_${i}`)}
                      <span class="layer-badge layer-{ann.layerId}">
                        {ann.layerId === 'vocal' ? abbreviateVocal(ann.label) : ann.label}
                      </span>
                      {#if i < displayAnns.length - 1}
                        <span class="badge-separator">·</span>
                      {/if}
                    {/each}
                  </span>
                {/if}

                <span class="token-text">{token.text}</span>
              </span>
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
    color: var(--surface-100);
    padding: 1rem;
  }

  .canvas-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-header {
    border-bottom: 1px solid var(--surface-800);
    padding-bottom: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .section-type {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 800;
    color: var(--primary-400);
    background: rgba(30, 41, 59, 0.5);
    padding: 0.3rem 0.85rem;
    border-radius: 1rem;
    border: 1px solid var(--surface-700);
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
    background: rgba(34, 211, 238, 0.08);
    box-shadow: inset 2px 0 0 rgba(34, 211, 238, 0.5);
  }

  /* ── Token layout: flex column ── */
  .token {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end; /* Push text to bottom */
    cursor: pointer;
    transition: color 0.2s;
    gap: 0.15rem;
  }

  .token.annotated {
    color: var(--primary-400);
  }

  .token:hover .token-text {
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
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
    color: var(--surface-500);
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
    color: #4ade80;
    font-size: 0.75rem;
  }

  .layer-vocal {
    font-size: 0.65rem;
    color: #f59e0b;
  }

  .layer-production {
    color: #818cf8;
    font-size: 0.65rem;
  }

  /* ── Meaning: visual-only (underline) ── */
  .token.has-meaning .token-text {
    border-bottom: 2px dashed rgba(34, 211, 238, 0.4);
    padding-bottom: 2px;
  }

  .canvas-line.line-highlighted .token.has-meaning .token-text {
    border-bottom-color: rgba(34, 211, 238, 1);
    text-shadow: 0 0 12px rgba(34, 211, 238, 0.5);
  }
</style>
