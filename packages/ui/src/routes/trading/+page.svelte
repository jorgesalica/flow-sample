<script lang="ts">
  import TradingFlow from '$lib/flows/trading/TradingFlow.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<TradingFlow initialData={data} />
