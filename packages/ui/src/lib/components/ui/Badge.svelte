<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    children,
    tone = 'neutral',
  }: { children: Snippet; tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' } = $props();
</script>

<span class="ui-badge ui-badge--{tone}">{@render children()}</span>
