<script lang="ts">
  import LyricsFlow from '$lib/flows/lyrics/LyricsFlow.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<LyricsFlow {data} />
