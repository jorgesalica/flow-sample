<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    state,
    title,
    message,
    action,
  }: {
    state: 'loading' | 'empty' | 'error';
    title: string;
    message?: string;
    action?: Snippet;
  } = $props();
</script>

<div class="ui-async-state" role={state === 'error' ? 'alert' : 'status'}>
  {#if state === 'loading'}<span class="ui-async-state__spinner" aria-hidden="true"></span>{/if}
  <strong>{title}</strong>
  {#if message}<p>{message}</p>{/if}
  {#if action}<div class="ui-async-state__action">{@render action()}</div>{/if}
</div>
