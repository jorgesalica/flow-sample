<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    state,
    title,
    message,
    action,
    compact = false,
  }: {
    state: 'loading' | 'empty' | 'error';
    title: string;
    message?: string;
    action?: Snippet;
    compact?: boolean;
  } = $props();
</script>

<div
  class="ui-async-state"
  class:ui-async-state--compact={compact}
  role={state === 'error' ? 'alert' : 'status'}
>
  {#if state === 'loading'}<span class="ui-async-state__spinner" aria-hidden="true"></span>{/if}
  <strong>{title}</strong>
  {#if message}<p>{message}</p>{/if}
  {#if action}<div class="ui-async-state__action">{@render action()}</div>{/if}
</div>
