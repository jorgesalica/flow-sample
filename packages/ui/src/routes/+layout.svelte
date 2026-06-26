<script lang="ts">
  import '../app.css';
  import { Toaster } from '$lib/toast';
  import type { Snippet } from 'svelte';

  let { children }: { children?: Snippet } = $props();
</script>

<Toaster />

{@render children?.()}
