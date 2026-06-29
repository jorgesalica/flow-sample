<script lang="ts">
  import type { AnnotationLayer } from '@flows/shared';

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
    <button
      class="layer-btn"
      class:active={isActive}
      style="--layer-color: {layer.color}"
      {disabled}
      onclick={() => toggleLayer(layer.id)}
      title="Toggle {layer.name}"
    >
      <span class="icon">{layer.icon}</span>
      <span class="name">{layer.name}</span>
    </button>
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

  .layer-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--surface-800);
    border: 1px solid var(--surface-700);
    border-radius: 9999px;
    color: var(--surface-300);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .layer-btn:hover:not(:disabled) {
    background: var(--surface-700);
    border-color: var(--surface-600);
    color: var(--surface-100);
  }

  .layer-btn.active {
    background: color-mix(in srgb, var(--layer-color) 15%, transparent);
    border-color: var(--layer-color);
    color: var(--layer-color);
  }

  .icon {
    font-size: 1rem;
  }
</style>
