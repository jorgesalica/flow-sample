<script lang="ts">
    import type { TokenAST, Annotation } from '@flows/shared';

    export let tokenAst: TokenAST;
    export let annotations: Annotation[] = [];
    export let activeLayers: string[] = [];
    
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
</script>

<div class="canvas-renderer" class:has-layers={activeLayers.length > 0}>
    {#each tokenAst.sections as section}
        <section class="canvas-section">
            <header class="section-header">
                <span class="section-type">{section.type}</span>
            </header>

            <div class="section-content">
                {#each section.lines as line}
                    <div class="canvas-line">
                        {#each line as token}
                            {@const activeAnns = getActiveAnnotations(token.id, activeLayers)}
                            
                            <span 
                                class="token {activeAnns.map(a => 'has-' + a.layerId).join(' ')}" 
                                class:annotated={activeAnns.length > 0}
                                data-id={token.id}
                            >
                                <!-- Render layer badges above/below based on active annotations -->
                                {#each activeAnns as ann}
                                    <span class="layer-badge layer-{ann.layerId}">
                                        {ann.label}
                                    </span>
                                {/each}
                                
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
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 700;
        color: var(--cosmic);
        background: var(--surface-800);
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        border: 1px solid var(--surface-700);
        display: inline-block;
    }

    .section-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .canvas-line {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        line-height: 3.5; /* Extra space for annotations */
    }

    .token {
        position: relative;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: color 0.2s;
    }

    .token.annotated {
        color: var(--primary-400);
    }

    .token:hover .token-text {
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    }

    .token-text {
        z-index: 1;
    }

    .layer-badge {
        position: absolute;
        font-size: 0.65rem;
        font-weight: 600;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0.9;
    }

    /* specific layer positioning logic will be extended later */
    .layer-chords {
        top: -1.2rem;
        color: #4ade80;
    }

    .layer-vocal {
        bottom: -1rem;
        font-size: 0.5rem;
        color: #f59e0b;
    }

    .layer-production {
        top: -1.2rem;
        right: -1rem;
        color: #818cf8;
    }

    .layer-meaning {
        bottom: -1rem;
        left: 0;
        font-size: 0.5rem;
        color: #22d3ee;
        opacity: 0.7;
    }

    .token.has-meaning .token-text {
        border-bottom: 2px dashed rgba(34, 211, 238, 0.5);
        padding-bottom: 2px;
    }

    .token.has-meaning:hover .token-text {
        border-bottom-color: rgba(34, 211, 238, 1);
        text-shadow: 0 0 10px rgba(34, 211, 238, 0.4);
    }
</style>
