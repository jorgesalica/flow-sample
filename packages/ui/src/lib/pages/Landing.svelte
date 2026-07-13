<script lang="ts">
  import { onMount } from 'svelte';
  import { AsyncState, Badge, FlowLayout } from '@lib/components';
  import { getFlows, type FlowDefinition, type FlowStats } from '@lib/flows';
  import FlowCard from './components/FlowCard.svelte';
  import type { FlowCardModel } from './types';

  const pageTitle = 'Cosmic Flow - Data Exploration Hub';

  const placeholderFlows: FlowCardModel[] = [
    {
      id: 'youtube',
      name: 'YouTube Flow',
      icon: '📺',
      description: 'Import and explore YouTube Music library',
      route: '/youtube',
      color: 'from-red-400 to-pink-500',
      stats: { count: 0, status: 'disabled', statusMessage: 'Coming Soon' },
      getStats: async () => ({ count: 0, status: 'disabled' }),
    },
  ];

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
    flows = [...flowsWithStats, ...placeholderFlows];
    isLoading = false;
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<FlowLayout>
  <section class="flow-index" aria-labelledby="flow-index-title">
    <header class="flow-index__header">
      <h1 id="flow-index-title">Flows</h1>
      {#if !isLoading}
        <div class="flow-index__summary" aria-label="Flow availability">
          <Badge tone="success">{readyFlowCount} ready</Badge>
          <Badge tone="neutral">{flows.length} total</Badge>
        </div>
      {/if}
    </header>

    <div class="flow-index__content">
      {#if isLoading}
        <AsyncState state="loading" title="Loading flow status" />
      {:else}
        <div class="flow-index__grid">
          {#each flows as flow (flow.id)}
            <FlowCard {flow} />
          {/each}
        </div>
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
    font-size: clamp(1.75rem, 4vw, 2.5rem);
  }

  .flow-index__summary {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .flow-index__content {
    min-height: 24rem;
    flex: 1 1 auto;
  }

  .flow-index__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  @media (max-width: 900px) {
    .flow-index__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .flow-index {
      gap: 1rem;
    }

    .flow-index__header {
      align-items: flex-start;
    }

    .flow-index__grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
