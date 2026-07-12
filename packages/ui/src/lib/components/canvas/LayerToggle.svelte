<script lang="ts">
  import type { AnnotationLayer } from '@flows/shared';
  import { Button } from '@lib/components';

  interface Props {
    layers: AnnotationLayer[];
    activeLayers?: string[];
    disabled?: boolean;
    /** Fired when a layer is toggled; replaces the old `toggle` event. */
    ontoggle?: (detail: { layerId: string; active: boolean }) => void;
  }

  let { layers, activeLayers = $bindable([]), disabled = false, ontoggle }: Props = $props();

  function toggleLayer(layerId: string) {
    if (disabled) return;

    const isActive = activeLayers.includes(layerId);
    let newActiveLayers: string[];

    if (isActive) {
      newActiveLayers = activeLayers.filter((id) => id !== layerId);
    } else {
      newActiveLayers = [...activeLayers, layerId];
    }

    // This makes the component controlled/uncontrolled hybrid for ease of use
    activeLayers = newActiveLayers;

    ontoggle?.({ layerId, active: !isActive });
  }
</script>

<div class="layer-toggles" class:disabled>
  {#each layers as layer (layer.id)}
    {@const isActive = activeLayers.includes(layer.id)}
    <Button
      class="layer-btn{isActive ? ' active' : ''}"
      style="--layer-color: {layer.color}"
      {disabled}
      variant="secondary"
      size="sm"
      aria-pressed={isActive}
      onclick={() => toggleLayer(layer.id)}
      title="Toggle {layer.name}"
    >
      <span class="icon">{layer.icon}</span>
      <span class="name">{layer.name}</span>
    </Button>
  {/each}
</div>

<style>
  .layer-toggles {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .layer-toggles.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  :global(.layer-toggles .layer-btn) {
    border-radius: 9999px;
  }

  :global(.layer-toggles .layer-btn.active) {
    background: color-mix(in srgb, var(--layer-color) 15%, transparent);
    border-color: var(--layer-color);
    color: var(--layer-color);
  }

  .icon {
    font-size: 1rem;
  }
</style>
