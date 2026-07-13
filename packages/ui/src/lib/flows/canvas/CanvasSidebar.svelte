<script lang="ts">
  import { AsyncState, Button, IconButton } from '@lib/components';
  import { canvasStore } from './stores.svelte';

  let { isMobileMenuOpen = $bindable(false) }: { isMobileMenuOpen?: boolean } = $props();

  function handleSelect(id: string): void {
    canvasStore.loadCanvas(id);
    isMobileMenuOpen = false;
  }

  function handleNew(): void {
    canvasStore.clearActive();
    isMobileMenuOpen = false;
  }
</script>

<aside class="canvas-sidebar" class:canvas-sidebar--open={isMobileMenuOpen} aria-label="Canvases">
  <div class="canvas-sidebar__header">
    <Button onclick={handleNew} class="canvas-sidebar__new">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M9 3a1 1 0 0 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H3a1 1 0 1 1 0-2h6V3Z" />
      </svg>
      New canvas
    </Button>
  </div>

  <div class="canvas-sidebar__content">
    {#if canvasStore.isLoading}
      <AsyncState state="loading" title="Loading canvases" />
    {:else if canvasStore.canvases.length === 0}
      <AsyncState state="empty" title="No canvases yet" message="Create one to begin." />
    {:else}
      <ul>
        {#each canvasStore.canvases as canvas (canvas.sourceId)}
          {@const isActive = canvasStore.activeCanvas?.sourceId === canvas.sourceId}
          <li>
            <button
              class="canvas-sidebar__item"
              class:canvas-sidebar__item--active={isActive}
              aria-current={isActive ? 'page' : undefined}
              onclick={() => handleSelect(canvas.sourceId)}
            >
              <strong>{canvas.meta?.title || 'Untitled'}</strong>
              <span>{canvas.meta?.author || 'User'}</span>
            </button>

            <IconButton
              label={`Delete canvas ${canvas.meta?.title || 'Untitled'}`}
              variant="danger"
              size="sm"
              class="canvas-sidebar__delete"
              onclick={() => canvasStore.deleteCanvas(canvas.sourceId)}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  d="M7 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h3a1 1 0 1 1 0 2h-1v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6H4a1 1 0 0 1 0-2h3V3Zm2 4a1 1 0 0 0-2 0v7a1 1 0 1 0 2 0V7Zm4 0a1 1 0 1 0-2 0v7a1 1 0 1 0 2 0V7Z"
                />
              </svg>
            </IconButton>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</aside>

<style>
  .canvas-sidebar {
    z-index: 20;
    display: flex;
    width: 16rem;
    min-width: 16rem;
    height: 100%;
    flex-direction: column;
    border-right: 1px solid var(--ui-border);
    background: var(--ui-surface);
  }

  .canvas-sidebar__header {
    flex: 0 0 auto;
    padding: 1rem;
    border-bottom: 1px solid var(--ui-border);
  }

  .canvas-sidebar__header :global(.canvas-sidebar__new) {
    width: 100%;
  }

  .canvas-sidebar svg {
    width: 1rem;
    height: 1rem;
  }

  .canvas-sidebar__content {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 0.5rem;
  }

  ul {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.25rem;
  }

  .canvas-sidebar__item {
    display: grid;
    min-width: 0;
    min-height: 2.75rem;
    flex: 1 1 auto;
    gap: 0.125rem;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--ui-text-muted);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  .canvas-sidebar__item:hover,
  .canvas-sidebar__item--active {
    border-color: var(--ui-border);
    background: var(--ui-surface-raised);
    color: var(--ui-text);
  }

  .canvas-sidebar__item--active {
    border-left-color: var(--ui-accent);
  }

  .canvas-sidebar__item:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }

  .canvas-sidebar__item strong,
  .canvas-sidebar__item span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .canvas-sidebar__item strong {
    font-size: 0.875rem;
  }

  .canvas-sidebar__item span {
    color: var(--ui-text-muted);
    font-size: 0.75rem;
  }

  .canvas-sidebar__content :global(.canvas-sidebar__delete) {
    opacity: 0;
  }

  li:hover :global(.canvas-sidebar__delete),
  :global(.canvas-sidebar__delete:focus-visible) {
    opacity: 1;
  }

  @media (max-width: 48rem) {
    .canvas-sidebar {
      position: absolute;
      inset: 0 auto 0 0;
      transform: translateX(-100%);
      transition: transform 150ms ease;
    }

    .canvas-sidebar--open {
      transform: translateX(0);
    }
  }

  @media (hover: none) {
    .canvas-sidebar__content :global(.canvas-sidebar__delete) {
      opacity: 1;
    }
  }
</style>
