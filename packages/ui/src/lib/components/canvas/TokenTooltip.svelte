<script lang="ts">
  import type { Annotation, AnnotationLayer } from '@flows/shared';

  interface Props {
    annotations?: Annotation[];
    layers?: AnnotationLayer[];
    x?: number;
    y?: number;
    visible?: boolean;
  }

  let { annotations = [], layers = [], x = 0, y = 0, visible = false }: Props = $props();

  // Map layer info for display
  function getLayerInfo(layerId: string) {
    return layers.find((l) => l.id === layerId);
  }
</script>

{#if visible && annotations.length > 0}
  <div class="tooltip-container" role="tooltip" style="left: {x}px; top: {y}px;">
    <div class="tooltip-content">
      {#each annotations as ann, i (`${ann.layerId}_${i}`)}
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
    display: flex;
    width: max-content;
    max-width: min(28rem, calc(100vw - 2rem));
    flex-direction: column;
    gap: 0.75rem;
    border: 1px solid var(--ui-border-strong);
    border-radius: 0.5rem;
    background: var(--ui-surface-raised);
    padding: 1rem;
    box-shadow: var(--ui-shadow);
  }

  .annotation-detail {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .annotation-detail:not(:last-child) {
    border-bottom: 1px solid var(--ui-border);
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
    letter-spacing: 0;
  }

  .label {
    color: var(--ui-text);
    font-weight: 600;
    margin-left: auto;
    background: var(--ui-surface-subtle);
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
  }

  .detail {
    font-size: 0.95rem;
    color: var(--ui-text-muted);
    line-height: 1.5;
  }
</style>
