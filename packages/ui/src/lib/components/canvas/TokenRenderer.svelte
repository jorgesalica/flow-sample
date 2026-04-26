<script lang="ts">
    import type { TokenAST, Annotation } from '@flows/shared';
    import { createEventDispatcher } from 'svelte';

    export let tokenAst: TokenAST;
    export let annotations: Annotation[] = [];
    export let activeLayers: string[] = [];
    
    const dispatch = createEventDispatcher<{
        tokenhover: { tokenId: string; el: HTMLElement } | null;
    }>();

    // Group annotations by token ID for O(1) lookup during render
    $: annotationsByToken = annotations.reduce((acc, ann) => {
        if (!acc[ann.tokenId]) acc[ann.tokenId] = [];
        acc[ann.tokenId].push(ann);
        return acc;
    }, {} as Record<string, Annotation[]>);

    // Filter annotations for a specific token that belong to active layers
    function getActiveAnnotations(tokenId: string, currentActiveLayers: string[]): Annotation[] {
        const tokenAnns = annotationsByToken[tokenId] || [];
        return tokenAnns.filter((ann: Annotation) => currentActiveLayers.includes(ann.layerId));
    }

    // Get annotations split by position: top (chords/production) vs bottom (vocal)
    function getTopAnnotations(anns: Annotation[]): Annotation[] {
        return anns.filter(a => a.layerId === 'chords' || a.layerId === 'production');
    }

    function getBottomAnnotations(anns: Annotation[]): Annotation[] {
        return anns.filter(a => a.layerId === 'vocal');
    }

    function hasMeaning(anns: Annotation[]): boolean {
        return anns.some(a => a.layerId === 'meaning');
    }

    // Line-level meaning highlight: track which line group is hovered
    let hoveredMeaningGroup: string | null = null;

    // Group meaning annotations by their label+detail to identify phrase groups
    $: meaningGroups = (() => {
        const groups: Record<string, Set<string>> = {};
        for (const ann of annotations) {
            if (ann.layerId !== 'meaning') continue;
            const key = `${ann.label}:::${ann.detail}`;
            if (!groups[key]) groups[key] = new Set();
            groups[key].add(ann.tokenId);
        }
        return groups;
    })();

    // Reverse lookup: tokenId → meaning group key
    $: tokenMeaningGroup = (() => {
        const map: Record<string, string> = {};
        for (const [key, tokenIds] of Object.entries(meaningGroups)) {
            for (const tid of tokenIds) {
                map[tid] = key;
            }
        }
        return map;
    })();

    // Check if a token is part of the currently hovered meaning group
    function isInHoveredMeaningGroup(tokenId: string): boolean {
        if (!hoveredMeaningGroup) return false;
        const group = meaningGroups[hoveredMeaningGroup];
        return group?.has(tokenId) ?? false;
    }

    function handleTokenMouseEnter(tokenId: string, anns: Annotation[], el: HTMLElement) {
        // If this token has a meaning annotation, highlight its whole group
        const groupKey = tokenMeaningGroup[tokenId];
        if (groupKey && activeLayers.includes('meaning')) {
            hoveredMeaningGroup = groupKey;
        }
        
        if (anns.length > 0) {
            dispatch('tokenhover', { tokenId, el });
        }
    }

    function handleTokenMouseLeave() {
        hoveredMeaningGroup = null;
        dispatch('tokenhover', null);
    }
</script>

<div class="canvas-renderer" class:has-layers={activeLayers.length > 0}>
    {#each tokenAst.sections as section}
        <section class="canvas-section">
            <header class="section-header">
                <span class="section-type">[ {section.type} ]</span>
            </header>

            <div class="section-content">
                {#each section.lines as line}
                    <div class="canvas-line">
                        {#each line as token}
                            {@const activeAnns = getActiveAnnotations(token.id, activeLayers)}
                            {@const topAnns = getTopAnnotations(activeAnns)}
                            {@const bottomAnns = getBottomAnnotations(activeAnns)}
                            {@const tokenHasMeaning = hasMeaning(activeAnns)}
                            {@const meaningHighlighted = isInHoveredMeaningGroup(token.id)}
                            
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <span 
                                class="token"
                                class:annotated={activeAnns.length > 0}
                                class:has-meaning={tokenHasMeaning && activeLayers.includes('meaning')}
                                class:meaning-highlighted={meaningHighlighted}
                                data-id={token.id}
                                on:mouseenter={(e) => handleTokenMouseEnter(token.id, activeAnns, e.currentTarget)}
                                on:mouseleave={handleTokenMouseLeave}
                            >
                                <!-- Top badges: Chords + Production, stacked vertically -->
                                {#if topAnns.length > 0}
                                    <span class="badge-stack top">
                                        {#each topAnns as ann}
                                            <span class="layer-badge layer-{ann.layerId}">
                                                {ann.label}
                                            </span>
                                        {/each}
                                    </span>
                                {/if}
                                
                                <span class="token-text">{token.text}</span>
                                
                                <!-- Bottom badges: Vocal only (meaning is hover-only, no badge) -->
                                {#if bottomAnns.length > 0}
                                    <span class="badge-stack bottom">
                                        {#each bottomAnns as ann}
                                            <span class="layer-badge layer-{ann.layerId}">
                                                {ann.label}
                                            </span>
                                        {/each}
                                    </span>
                                {/if}
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
    }

    /* ── Token layout: flex column with badge stacks ── */
    .token {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
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

    /* ── Badge stacks: replace absolute positioning with flex flow ── */
    .badge-stack {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.1rem;
        min-height: 0.9rem; /* Reserve space even when empty so layout stays stable */
    }

    .badge-stack.top {
        order: -1; /* Render above token-text */
    }

    .badge-stack.bottom {
        order: 1; /* Render below token-text */
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

    /* ── Meaning: visual-only (underline + glow), no badge ── */
    .token.has-meaning .token-text {
        border-bottom: 2px dashed rgba(34, 211, 238, 0.4);
        padding-bottom: 2px;
    }

    .token.meaning-highlighted .token-text {
        border-bottom-color: rgba(34, 211, 238, 1);
        background: rgba(34, 211, 238, 0.08);
        text-shadow: 0 0 12px rgba(34, 211, 238, 0.5);
        border-radius: 2px;
    }
</style>
