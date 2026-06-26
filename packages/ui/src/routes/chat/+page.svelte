<script lang="ts">
  import ChatFlow from '$lib/flows/chat/ChatFlow.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<ChatFlow initialData={data} />
