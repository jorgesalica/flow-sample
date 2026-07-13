<script lang="ts">
  import type { Snippet } from 'svelte';

  type PanelElement = 'article' | 'div' | 'section';
  type PanelPadding = 'none' | 'sm' | 'md' | 'lg';

  interface Props {
    children: Snippet;
    element?: PanelElement;
    padding?: PanelPadding;
    raised?: boolean;
    ariaLabel?: string;
    class?: string;
  }

  let {
    children,
    element = 'div',
    padding = 'md',
    raised = false,
    ariaLabel,
    class: className = '',
  }: Props = $props();

  const classes = $derived(
    `ui-panel ui-panel--${padding}${raised ? ' ui-panel--raised' : ''} ${className}`
  );
</script>

{#if element === 'section'}
  <section class={classes} aria-label={ariaLabel}>{@render children()}</section>
{:else if element === 'article'}
  <article class={classes} aria-label={ariaLabel}>{@render children()}</article>
{:else}
  <div class={classes} aria-label={ariaLabel}>{@render children()}</div>
{/if}

<style>
  .ui-panel {
    min-width: 0;
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    background: var(--ui-surface);
    color: var(--ui-text);
  }

  .ui-panel--raised {
    background: var(--ui-surface-raised);
  }

  .ui-panel--none {
    padding: 0;
  }

  .ui-panel--sm {
    padding: 0.75rem;
  }

  .ui-panel--md {
    padding: 1rem;
  }

  .ui-panel--lg {
    padding: 1.5rem;
  }
</style>
