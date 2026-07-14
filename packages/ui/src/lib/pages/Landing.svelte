<script lang="ts">
  import { onMount } from 'svelte';
  import { AsyncState, FlowLayout } from '@lib/components';
  import { getFlows, type FlowDefinition, type FlowStats } from '@lib/flows';
  import FlowBoard from './components/FlowBoard.svelte';
  import type { FlowCardModel } from './types';

  const pageTitle = 'Cosmic Flow - Data Exploration Hub';

  let flows = $state<FlowCardModel[]>([]);
  let isLoading = $state(true);
  const readyFlowCount = $derived(
    flows.filter((flow) => ['active', 'configured'].includes(flow.stats.status)).length
  );

  async function resolveFlow(flow: FlowDefinition): Promise<FlowCardModel> {
    try {
      return { ...flow, stats: await flow.getStats() };
    } catch {
      const stats: FlowStats = { count: 0, status: 'error' };
      return { ...flow, stats };
    }
  }

  onMount(async () => {
    const flowsWithStats = await Promise.all(getFlows().map(resolveFlow));
    flows = flowsWithStats;
    isLoading = false;
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<FlowLayout>
  <section class="flow-index" aria-labelledby="flow-index-title">
    <header class="flow-index__header">
      <h1 id="flow-index-title">Board</h1>
    </header>

    <div class="flow-index__content">
      {#if isLoading}
        <AsyncState state="loading" title="Loading flow status" />
      {:else}
        <FlowBoard {flows} {readyFlowCount} />
      {/if}
    </div>
  </section>
</FlowLayout>

<style>
  .flow-index {
    display: flex;
    min-height: calc(100dvh - var(--app-nav-height) - 3.5rem);
    flex-direction: column;
    gap: 1.5rem;
  }

  .flow-index__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--ui-border);
  }

  .flow-index__header h1 {
    margin: 0;
    font-size: 2rem;
  }

  .flow-index__content {
    display: flex;
    min-height: 24rem;
    flex: 1 1 auto;
  }

  @media (max-width: 40rem) {
    .flow-index {
      gap: 1rem;
    }

    .flow-index__header h1 {
      font-size: 1.75rem;
    }
  }
</style>
