<script lang="ts">
  import type { Snippet } from 'svelte';
  import IconButton from './IconButton.svelte';

  let {
    title,
    children,
    footer,
    onclose,
  }: { title: string; children: Snippet; footer?: Snippet; onclose: () => void } = $props();

  const titleId = $props.id();
</script>

<div
  class="ui-modal-backdrop"
  role="presentation"
  onclick={(event) => event.currentTarget === event.target && onclose()}
>
  <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
    <header class="ui-modal__header">
      <h2 id={titleId}>{title}</h2>
      <IconButton label="Close" onclick={onclose}>
        <span aria-hidden="true">×</span>
      </IconButton>
    </header>
    <div class="ui-modal__body">{@render children()}</div>
    {#if footer}<footer class="ui-modal__footer">{@render footer()}</footer>{/if}
  </div>
</div>
