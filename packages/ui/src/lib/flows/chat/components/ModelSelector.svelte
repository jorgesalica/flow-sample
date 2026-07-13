<script lang="ts">
  import type { ChatProviderGroup } from '@flows/shared';
  import { Badge } from '@lib/components';
  import { slide } from 'svelte/transition';
  import { chatStore } from '../stores.svelte';

  type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

  let dropdownOpen = $state(false);

  function setMode(mode: 'rotation' | 'specific'): void {
    chatStore.setMode(mode);
    if (mode === 'rotation') dropdownOpen = false;
  }

  function selectModel(provider: string, modelId: string): void {
    chatStore.setModel(`${provider}:${modelId}`);
    dropdownOpen = false;
  }

  function toggleDropdown(): void {
    if (chatStore.chatMode === 'specific') dropdownOpen = !dropdownOpen;
  }

  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.model-selector')) dropdownOpen = false;
  }

  function parseSelected(selection: string): { provider: string; model: string } {
    const separator = selection.indexOf(':');
    if (separator === -1) return { provider: '', model: selection };
    return {
      provider: selection.slice(0, separator),
      model: selection.slice(separator + 1),
    };
  }

  function getModelDisplayName(modelId: string, catalog: ChatProviderGroup[]): string {
    for (const group of catalog) {
      const match = group.models.find((model) => model.id === modelId);
      if (match) return match.name;
    }

    return modelId
      .split(/[-/]/)
      .filter((word) => word !== 'free' && word !== '')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function tierTone(tier: string): BadgeTone {
    switch (tier) {
      case 'very_high':
        return 'warning';
      case 'high':
        return 'success';
      case 'medium':
        return 'info';
      default:
        return 'neutral';
    }
  }

  function tierLabel(tier: string): string {
    switch (tier) {
      case 'very_high':
        return 'VH';
      case 'high':
        return 'H';
      case 'medium':
        return 'M';
      case 'low':
        return 'L';
      default:
        return '?';
    }
  }

  let selected = $derived(parseSelected(chatStore.selectedModel));
  let selectedDisplayName = $derived(getModelDisplayName(selected.model, chatStore.catalog));
</script>

<svelte:window onclick={handleClickOutside} />

<div class="model-selector">
  <div class="model-selector__modes" role="group" aria-label="Chat mode">
    <button
      class:active={chatStore.chatMode === 'rotation'}
      aria-pressed={chatStore.chatMode === 'rotation'}
      onclick={() => setMode('rotation')}
      title="Round-robin across free providers"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h5m11 11v-5h-5M5 9a8 8 0 0 1 13-3m1 9a8 8 0 0 1-13 3"
        />
      </svg>
      <span>Rotate</span>
    </button>
    <button
      class:active={chatStore.chatMode === 'specific'}
      aria-pressed={chatStore.chatMode === 'specific'}
      onclick={() => setMode('specific')}
      title="Choose a specific provider and model"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m5 4 14 7-6 2-2 6L5 4Z"
        />
      </svg>
      <span>Specific</span>
    </button>
  </div>

  {#if chatStore.chatMode === 'rotation'}
    <div class="model-selector__summary" aria-live="polite">
      {#if chatStore.lastProvider}
        <strong>{chatStore.lastProvider}</strong>
        <span aria-hidden="true">/</span>
        <span>{getModelDisplayName(chatStore.lastModel, chatStore.catalog)}</span>
      {:else}
        <span>Auto-rotate</span>
      {/if}
    </div>
  {:else}
    <button
      class="model-selector__trigger"
      aria-expanded={dropdownOpen}
      aria-controls="chat-model-menu"
      aria-haspopup="menu"
      onclick={toggleDropdown}
    >
      <strong>{selected.provider || 'Model'}</strong>
      <span aria-hidden="true">/</span>
      <span>{selectedDisplayName || 'Select'}</span>
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class:open={dropdownOpen}>
        <path
          fill-rule="evenodd"
          d="M5.2 7.2a.75.75 0 0 1 1.1 0l3.7 3.7 3.7-3.7a.75.75 0 1 1 1.1 1.1l-4.3 4.2a.75.75 0 0 1-1 0L5.2 8.3a.75.75 0 0 1 0-1.1Z"
          clip-rule="evenodd"
        />
      </svg>
    </button>
  {/if}

  {#if dropdownOpen}
    <div
      id="chat-model-menu"
      class="model-selector__menu"
      role="menu"
      transition:slide={{ duration: 150 }}
    >
      {#each chatStore.catalog as group (group.provider)}
        {#if group.models.length > 0}
          <div class="model-selector__group-label">{group.provider}</div>
          {#each group.models as model (model.id)}
            {@const fullId = `${group.provider}:${model.id}`}
            {@const isSelected = chatStore.selectedModel === fullId}
            <button
              class="model-selector__option"
              class:selected={isSelected}
              role="menuitemradio"
              aria-checked={isSelected}
              onclick={() => selectModel(group.provider, model.id)}
            >
              <span class="model-selector__option-copy">
                <strong>{model.name}</strong>
                {#if model.description}<small>{model.description}</small>{/if}
              </span>
              <span title={model.tier}
                ><Badge tone={tierTone(model.tier)}>{tierLabel(model.tier)}</Badge></span
              >
            </button>
          {/each}
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .model-selector {
    position: relative;
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.5rem;
  }

  .model-selector__modes {
    display: flex;
    flex: 0 0 auto;
    overflow: hidden;
    border: 1px solid var(--ui-border);
    border-radius: 0.375rem;
    background: var(--ui-surface);
  }

  .model-selector__modes button {
    display: flex;
    min-height: 2rem;
    align-items: center;
    gap: 0.375rem;
    cursor: pointer;
    border: 0;
    background: transparent;
    color: var(--ui-text-muted);
    padding: 0.375rem 0.625rem;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .model-selector__modes button + button {
    border-left: 1px solid var(--ui-border);
  }

  .model-selector__modes button:hover,
  .model-selector__modes button.active {
    background: var(--ui-accent-strong);
    color: var(--ui-accent-contrast);
  }

  .model-selector button:focus-visible {
    position: relative;
    z-index: 1;
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }

  .model-selector__modes svg,
  .model-selector__trigger svg {
    width: 0.875rem;
    height: 0.875rem;
    flex: 0 0 auto;
  }

  .model-selector__summary,
  .model-selector__trigger {
    display: flex;
    min-width: 0;
    min-height: 2rem;
    align-items: center;
    gap: 0.375rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.375rem;
    background: var(--ui-surface);
    color: var(--ui-text-muted);
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
  }

  .model-selector__summary strong,
  .model-selector__trigger strong {
    color: var(--ui-accent);
    text-transform: capitalize;
  }

  .model-selector__summary > span:last-child,
  .model-selector__trigger > span:not([aria-hidden]) {
    max-width: 9rem;
    overflow: hidden;
    color: var(--ui-text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .model-selector__trigger {
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
  }

  .model-selector__trigger:hover {
    border-color: var(--ui-border-strong);
  }

  .model-selector__trigger svg {
    transition: transform 150ms ease;
  }

  .model-selector__trigger svg.open {
    transform: rotate(180deg);
  }

  .model-selector__menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    z-index: 50;
    width: min(18rem, calc(100vw - 1.5rem));
    max-height: 22.5rem;
    overflow-y: auto;
    border: 1px solid var(--ui-border-strong);
    border-radius: 0.5rem;
    background: var(--ui-surface-raised);
    box-shadow: var(--ui-shadow);
  }

  .model-selector__group-label {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-surface-raised);
    color: var(--ui-text-muted);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .model-selector__option {
    display: flex;
    width: 100%;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    border: 0;
    border-bottom: 1px solid var(--ui-border);
    background: transparent;
    color: var(--ui-text);
    padding: 0.625rem 0.75rem;
    text-align: left;
  }

  .model-selector__option:hover,
  .model-selector__option.selected {
    background: var(--ui-surface-subtle);
  }

  .model-selector__option.selected {
    box-shadow: inset 3px 0 var(--ui-accent);
  }

  .model-selector__option-copy {
    display: grid;
    min-width: 0;
    flex: 1 1 auto;
    gap: 0.125rem;
  }

  .model-selector__option-copy strong,
  .model-selector__option-copy small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .model-selector__option-copy strong {
    font-size: 0.8rem;
  }

  .model-selector__option-copy small {
    color: var(--ui-text-muted);
    font-size: 0.7rem;
  }

  @media (max-width: 40rem) {
    .model-selector__modes span {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }

    .model-selector__modes button {
      width: 2.25rem;
      justify-content: center;
      padding-inline: 0.5rem;
    }

    .model-selector__summary > span:last-child,
    .model-selector__trigger > span:not([aria-hidden]) {
      max-width: 5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .model-selector__trigger svg {
      transition: none;
    }
  }
</style>
