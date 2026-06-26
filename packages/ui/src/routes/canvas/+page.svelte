<script lang="ts">
  import CanvasFlow from '$lib/flows/canvas/CanvasFlow.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<CanvasFlow canvases={data.canvases} />
