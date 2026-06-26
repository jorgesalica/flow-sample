<script lang="ts">
  import { onMount } from 'svelte';
  import { getFlows, type FlowDefinition, type FlowStats } from '@lib/flows';
  import { FlowLayout } from '@lib/components';

  // Page title
  const pageTitle = 'Flow - Data Exploration Hub';

  interface FlowCard extends FlowDefinition {
    stats?: FlowStats;
  }

  // Placeholder flows for "coming soon" features
  const placeholderFlows: FlowCard[] = [
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

  let flows: FlowCard[] = $state([]);
  let isLoading = $state(true);

  onMount(async () => {
    const registeredFlows = getFlows();

    const flowsWithStats = await Promise.all(
      registeredFlows.map(async (flow) => {
        try {
          const stats = await flow.getStats();
          return { ...flow, stats };
        } catch {
          return { ...flow, stats: { count: 0, status: 'error' as const } };
        }
      })
    );

    flows = [...flowsWithStats, ...placeholderFlows];
    isLoading = false;
  });

  function getStatusClass(status: FlowStats['status']): string {
    switch (status) {
      case 'active':
        return 'text-aurora bg-aurora/10 border border-aurora/20';
      case 'configured':
        return 'text-pulsar bg-pulsar/10 border border-pulsar/20';
      case 'error':
        return 'text-red-400 bg-red-400/10 border border-red-400/20';
      default:
        return 'text-white/30 bg-white/5 border border-white/10';
    }
  }

  function getStatusLabel(stats: FlowStats): string {
    if (stats.statusMessage) return stats.statusMessage;
    switch (stats.status) {
      case 'active':
        return 'Explore →';
      case 'configured':
        return 'Configured';
      case 'error':
        return 'Error';
      default:
        return 'Coming Soon';
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<FlowLayout>
  <div class="flex items-center justify-center min-h-[calc(100vh-8rem)]">
    <div class="max-w-4xl w-full flex flex-col gap-10">
      <!-- Header -->
      <header class="text-center">
        <div class="flex justify-center mb-4">
          <img src="/favicon.png" alt="Cosmic Flow" class="w-16 h-16 rounded-2xl" />
        </div>
        <h1 class="text-5xl md:text-6xl font-bold text-cosmic">Cosmic Flow</h1>
        <p class="text-white/40 mt-4 text-lg">Your data flow playground</p>
      </header>

      <!-- Flow Cards -->
      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#if isLoading}
          <!-- Loading Skeleton -->
          {#each [0, 1, 2] as i (i)}
            <div class="glass p-6 h-48 skeleton"></div>
          {/each}
        {:else}
          {#each flows as flow (flow.id)}
            {@const isClickable =
              flow.stats?.status === 'active' || flow.stats?.status === 'configured'}
            <a
              href={isClickable ? flow.route : undefined}
              class="glass glass-hover p-6 transition-all duration-300
                   {isClickable
                ? 'hover:scale-[1.02] cursor-pointer'
                : 'opacity-40 cursor-not-allowed'}"
            >
              <div class="flex items-center gap-3 mb-4">
                <span class="text-4xl">{flow.icon}</span>
                <div
                  class="w-2 h-2 rounded-full {flow.stats?.status === 'active'
                    ? 'bg-aurora glow-pulse'
                    : 'bg-white/10'}"
                ></div>
              </div>

              <h2 class="text-xl font-semibold text-white">{flow.name}</h2>
              <p class="text-white/40 text-sm mt-2 leading-relaxed">{flow.description}</p>

              {#if flow.stats && flow.stats.count > 0}
                <div class="flex gap-6 mt-5 pt-4 border-t border-white/5">
                  <div>
                    <div class="text-2xl font-bold text-aurora">{flow.stats.count}</div>
                    <div class="text-xs text-white/30 uppercase tracking-wider">Items</div>
                  </div>
                </div>
              {/if}

              {#if flow.stats}
                <div
                  class="mt-4 text-xs {getStatusClass(
                    flow.stats.status
                  )} rounded-full px-3 py-1 inline-block font-medium"
                >
                  {getStatusLabel(flow.stats)}
                </div>
              {/if}
            </a>
          {/each}
        {/if}
      </section>

      <!-- Footer -->
      <footer class="text-center text-white/20 text-sm">
        Cosmic Flow — An improvisational data vignette
      </footer>
    </div>
  </div>
</FlowLayout>
