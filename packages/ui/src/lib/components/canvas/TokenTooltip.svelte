<script lang="ts">
    import type { Annotation, AnnotationLayer } from '@flows/shared';

    export let annotations: Annotation[] = [];
    export let layers: AnnotationLayer[] = [];
    export let x: number = 0;
    export let y: number = 0;
    export let visible: boolean = false;

    // Map layer info for display
    $: getLayerInfo = (layerId: string) => layers.find(l => l.id === layerId);
</script>

{#if visible && annotations.length > 0}
    <div 
        class="tooltip-container"
        style="left: {x}px; top: {y}px;"
    >
        <div class="tooltip-content">
            {#each annotations as ann}
                {@const layerInfo = getLayerInfo(ann.layerId)}
                <div class="annotation-detail">
                    <div class="header">
                        {#if layerInfo}
                            <span class="icon" style="color: {layerInfo.color}">{layerInfo.icon}</span>
                            <span class="layer-name" style="color: {layerInfo.color}">{layerInfo.name}</span>
                        {/if}
                        <span class="label">{ann.label}</span>
                    </div>
                    <div class="detail">{ann.detail}</div>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .tooltip-container {
        position: fixed;
        z-index: 9999;
        transform: translate(-50%, 10px);
        pointer-events: none;
    }

    .tooltip-content {
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(8px);
        border: 1px solid var(--aurora);
        border-radius: 0.5rem;
        padding: 1rem;
        width: max-content;
        max-width: 450px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .annotation-detail {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .annotation-detail:not(:last-child) {
        border-bottom: 1px solid var(--surface-800);
        padding-bottom: 0.75rem;
    }

    .header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
    }

    .layer-name {
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .label {
        color: var(--surface-100);
        font-weight: 600;
        margin-left: auto;
        background: var(--surface-800);
        padding: 0.2rem 0.5rem;
        border-radius: 0.25rem;
    }

    .detail {
        font-size: 0.95rem;
        color: var(--surface-200);
        line-height: 1.5;
    }
</style>
