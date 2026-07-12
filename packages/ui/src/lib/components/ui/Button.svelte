<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    children: Snippet;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
  }

  let {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    class: className = '',
    type = 'button',
    ...rest
  }: Props = $props();
</script>

<button
  {type}
  class="ui-button ui-button--{variant} ui-button--{size} {className}"
  disabled={disabled || loading}
  aria-busy={loading}
  {...rest}
>
  {#if loading}<span class="ui-button__spinner" aria-hidden="true"></span>{/if}
  {@render children()}
</button>
