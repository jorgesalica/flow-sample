<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    label: string;
    children: Snippet;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
  }

  let {
    label,
    children,
    variant = 'ghost',
    size = 'md',
    class: className = '',
    type = 'button',
    ...rest
  }: Props = $props();
</script>

<button
  {type}
  class="ui-icon-button ui-icon-button--{variant} ui-icon-button--{size} {className}"
  aria-label={label}
  title={label}
  {...rest}
>
  {@render children()}
</button>
