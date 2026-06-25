<script lang="ts">
    import CanvasSidebar from './CanvasSidebar.svelte';
    import CanvasEditor from './CanvasEditor.svelte';
    import TokenRenderer from '@components/canvas/TokenRenderer.svelte';
    import LayerToggle from '@components/canvas/LayerToggle.svelte';
    import TokenTooltip from '@components/canvas/TokenTooltip.svelte';
    import FlowLayout from '../../components/layout/FlowLayout.svelte';
    import { canvasStore } from './stores';
    import { marked } from 'marked';
    import DOMPurify from 'dompurify';

    let isMobileMenuOpen = false;
    
    // UI State for viewer
    let activeLayers: string[] = ['meaning'];
    
    // Tooltip State
    let tooltipX = 0;
    let tooltipY = 0;
    let tooltipVisible = false;
    let tooltipAnnotations: any[] = [];

    function toggleMobileMenu() {
        isMobileMenuOpen = !isMobileMenuOpen;
    }

    function handleTokenHover(e: CustomEvent<{ tokenId: string; el: HTMLElement } | null>) {
        const detail = e.detail;
        const analysis = $canvasStore.activeCanvas;
        
        if (!detail || !analysis) {
            tooltipVisible = false;
            return;
        }

        const { tokenId, el } = detail;

        // Find active annotations for this token
        const anns = analysis.annotations.filter(
            a => a.tokenId === tokenId && activeLayers.includes(a.layerId)
        );

        if (anns.length > 0) {
            const rect = el.getBoundingClientRect();
            tooltipX = rect.left + (rect.width / 2);
            tooltipY = rect.bottom + 10;
            tooltipAnnotations = anns;
            tooltipVisible = true;
        } else {
            tooltipVisible = false;
        }
    }

    function toggleLayer(layerId: string) {
        if (activeLayers.includes(layerId)) {
            activeLayers = activeLayers.filter(l => l !== layerId);
        } else {
            activeLayers = [...activeLayers, layerId];
        }
    }
</script>

<FlowLayout>
    <div class="fixed inset-0 pt-16 flex bg-slate-950 overflow-hidden text-slate-100">
        <!-- Sidebar -->
        <CanvasSidebar bind:isMobileMenuOpen />

        <!-- Main Area -->
        <main class="flex-1 flex flex-col h-full bg-slate-950 relative custom-scrollbar overflow-y-auto">
            <!-- Header -->
            <header class="h-14 flex items-center justify-between px-4 border-b border-cosmic-800/50 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div class="flex items-center gap-3">
                    <button
                        class="md:hidden text-slate-400 hover:text-white"
                        aria-label="Toggle mobile menu"
                        on:click={toggleMobileMenu}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                    
                    {#if $canvasStore.activeCanvas}
                        <div class="flex flex-col">
                            <h1 class="text-sm font-semibold text-slate-200">
                                {$canvasStore.activeCanvas.meta?.title || 'Untitled'}
                            </h1>
                            <span class="text-xs text-slate-500">
                                {$canvasStore.activeCanvas.meta?.author || 'User'}
                            </span>
                        </div>
                    {:else}
                        <h1 class="text-lg font-semibold text-slate-200">Text Analysis Canvas</h1>
                    {/if}
                </div>
                
                {#if $canvasStore.activeCanvas}
                    <!-- Layer Toggles -->
                    <div class="flex gap-2">
                        <LayerToggle 
                            layers={$canvasStore.activeCanvas.layers} 
                            bind:activeLayers 
                        />
                    </div>
                {/if}
            </header>

            <div class="flex-1">
                {#if $canvasStore.activeCanvas}
                    <div class="max-w-4xl mx-auto p-4 md:p-8 relative min-h-full">
                        
                        <!-- Meta summary if exists -->
                        {#if $canvasStore.activeCanvas.meta?.summary}
                            <div class="mb-8 p-6 bg-slate-900/50 border border-cosmic-800/50 rounded-xl">
                                <h3 class="text-lg font-semibold text-white mb-2">Overview</h3>
                                <p class="text-slate-300">{$canvasStore.activeCanvas.meta.summary}</p>
                                
                                <div class="flex gap-4 mt-4 pt-4 border-t border-slate-800">
                                    {#if $canvasStore.activeCanvas.meta.theme}
                                        <div>
                                            <span class="text-xs text-slate-500 uppercase tracking-wider block">Theme</span>
                                            <span class="text-sm text-primary-300">{$canvasStore.activeCanvas.meta.theme}</span>
                                        </div>
                                    {/if}
                                    {#if $canvasStore.activeCanvas.meta.tone}
                                        <div>
                                            <span class="text-xs text-slate-500 uppercase tracking-wider block">Tone</span>
                                            <span class="text-sm text-aurora">{$canvasStore.activeCanvas.meta.tone}</span>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/if}

                        <TokenRenderer 
                            tokenAst={$canvasStore.activeCanvas.tokenAst} 
                            annotations={$canvasStore.activeCanvas.annotations}
                            activeLayers={activeLayers}
                            on:tokenhover={handleTokenHover}
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
        </main>

        <!-- Overlay for mobile when sidebar is open -->
        {#if isMobileMenuOpen}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="fixed inset-0 bg-black/60 z-10 md:hidden"
                on:click={() => (isMobileMenuOpen = false)}
            ></div>
        {/if}
    </div>
</FlowLayout>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--surface-800);
        border-radius: 4px;
    }
    .custom-scrollbar:hover::-webkit-scrollbar-thumb {
        background: var(--surface-700);
    }
</style>
