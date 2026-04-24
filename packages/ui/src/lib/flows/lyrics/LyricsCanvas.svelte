<script lang="ts">
    import { onMount } from 'svelte';
    import { getCanvasAnalysis, analyzeCanvas, type CanvasStatusResponse } from './canvas-api';
    import type { CanvasAnalysis } from '@flows/shared';
    import TokenRenderer from '@components/canvas/TokenRenderer.svelte';
    import LayerToggle from '@components/canvas/LayerToggle.svelte';
    import TokenTooltip from '@components/canvas/TokenTooltip.svelte';

    export let trackId: string;

    let loading = true;
    let analyzing = false;
    let error: string | null = null;
    
    let analysis: CanvasAnalysis | null = null;
    let statusInfo: CanvasStatusResponse['source'] | null = null;
    
    // UI State
    let activeLayers: string[] = ['chords', 'vocal'];
    
    // Tooltip State
    let tooltipX = 0;
    let tooltipY = 0;
    let tooltipVisible = false;
    let tooltipAnnotations: any[] = [];

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        error = null;
        try {
            const result = await getCanvasAnalysis(trackId);
            if ('needsAnalysis' in result) {
                statusInfo = result.source || null;
            } else {
                analysis = result as CanvasAnalysis;
            }
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function handleAnalyze() {
        analyzing = true;
        error = null;
        try {
            analysis = await analyzeCanvas(trackId);
        } catch (err: any) {
            error = err.message;
        } finally {
            analyzing = false;
        }
    }

    function handleTokenHover(e: MouseEvent) {
        const target = e.target as HTMLElement;
        const tokenEl = target.closest('.token');
        
        if (!tokenEl || !analysis) {
            tooltipVisible = false;
            return;
        }

        const tokenId = tokenEl.getAttribute('data-id');
        if (!tokenId) return;

        // Find active annotations for this token
        const anns = analysis.annotations.filter(
            a => a.tokenId === tokenId && activeLayers.includes(a.layerId)
        );

        if (anns.length > 0) {
            const rect = tokenEl.getBoundingClientRect();
            tooltipX = rect.left + (rect.width / 2);
            tooltipY = rect.bottom + 10;
            tooltipAnnotations = anns;
            tooltipVisible = true;
        } else {
            tooltipVisible = false;
        }
    }

    function handleMouseLeave() {
        tooltipVisible = false;
    }
</script>

<div class="canvas-container">
    {#if loading}
        <div class="center-state">
            <div class="spinner"></div>
            <p>Loading canvas...</p>
        </div>
    {:else if error}
        <div class="center-state error">
            <p>{error}</p>
            <button class="btn" on:click={loadData}>Retry</button>
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
                <button 
                    class="btn primary" 
                    on:click={handleAnalyze} 
                    disabled={analyzing}
                >
                    {#if analyzing}
                        <div class="spinner small"></div>
                        Analyzing Lyrics... (This may take a minute)
                    {:else}
                        Generate Analysis
                    {/if}
                </button>
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
                                <span class="tag">🎵 {analysis.meta.key}</span>
                            {/if}
                            {#if analysis.meta.bpm}
                                <span class="tag">⏱️ {analysis.meta.bpm} BPM</span>
                            {/if}
                            {#if analysis.meta.mood}
                                <span class="tag">✨ {analysis.meta.mood}</span>
                            {/if}
                        </div>
                    {/if}
                </div>
                
                <div class="controls">
                    <LayerToggle 
                        layers={analysis.layers} 
                        bind:activeLayers 
                    />
                </div>
            </div>
        </header>

        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <main 
            class="canvas-main" 
            on:mousemove={handleTokenHover}
            on:mouseleave={handleMouseLeave}
        >
            <TokenRenderer 
                tokenAst={analysis.tokenAst} 
                annotations={analysis.annotations}
                activeLayers={activeLayers}
            />
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
        background: var(--surface-900);
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
        width: 120px;
        height: 120px;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);
    }

    h2 {
        font-size: 2rem;
        margin: 0;
        background: linear-gradient(to right, var(--primary-400), var(--secondary-400));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .author {
        font-size: 1.25rem;
        color: var(--surface-300);
        margin: 0;
    }

    .description {
        color: var(--surface-400);
        max-width: 400px;
        line-height: 1.5;
    }

    .actions {
        margin-top: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .btn {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid var(--surface-700);
        background: var(--surface-800);
        color: var(--surface-100);
    }

    .btn.primary {
        background: var(--primary-600);
        border-color: var(--primary-500);
    }

    .btn:hover:not(:disabled) {
        transform: translateY(-2px);
        filter: brightness(1.1);
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid var(--surface-700);
        border-top-color: var(--primary-500);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .spinner.small {
        width: 1.25rem;
        height: 1.25rem;
        border-width: 2px;
        border-top-color: white;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .canvas-header {
        position: sticky;
        top: 0;
        z-index: 10;
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--surface-800);
        padding: 1.5rem 2rem;
    }

    .header-content {
        max-width: 1000px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 1.5rem;
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

    .tag {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        background: var(--surface-800);
        border-radius: 0.25rem;
        color: var(--surface-300);
    }

    .canvas-main {
        max-width: 1000px;
        margin: 0 auto;
        padding: 2rem;
        width: 100%;
    }
</style>
