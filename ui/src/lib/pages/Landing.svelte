<script lang="ts">
  import { onMount } from 'svelte';
  import { getFlows, type FlowDefinition, type FlowStats } from '../flows';

  interface FlowCard extends FlowDefinition {
    stats?: FlowStats;
  }

  // Placeholder flows for "coming soon" features
  const placeholderFlows: FlowCard[] = [
    {
      id: 'lyrics',
      name: 'Lyrics Flow',
      icon: '📝',
      description: 'Analyze song lyrics and discover themes',
      route: '#/lyrics',
      color: 'from-blue-400 to-cyan-500',
      stats: { count: 0, status: 'disabled', statusMessage: 'Coming Soon' },
      getStats: async () => ({ count: 0, status: 'disabled' }),
    },
    {
      id: 'youtube',
      name: 'YouTube Flow',
      icon: '📺',
      description: 'Import and explore YouTube Music library',
      route: '#/youtube',
      color: 'from-red-400 to-pink-500',
      stats: { count: 0, status: 'disabled', statusMessage: 'Coming Soon' },
      getStats: async () => ({ count: 0, status: 'disabled' }),
    },
  ];

  let flows: FlowCard[] = $state([]);

  onMount(async () => {
    // Get registered flows
    const registeredFlows = getFlows();

    // Load stats for each registered flow
    const flowsWithStats = await Promise.all(
      registeredFlows.map(async (flow) => {
        try {
          const stats = await flow.getStats();
          return { ...flow, stats };
        } catch {
          return { ...flow, stats: { count: 0, status: 'error' as const } };
        }
      }),
    );

    // Combine with placeholder flows
    flows = [...flowsWithStats, ...placeholderFlows];
  });

  function getStatusClass(status: FlowStats['status']): string {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/10';
      case 'configured':
        return 'text-blue-400 bg-blue-400/10';
      case 'error':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-white/40 bg-white/5';
    }
  }

  function getStatusLabel(stats: FlowStats): string {
    if (stats.statusMessage) return stats.statusMessage;
    switch (stats.status) {
      case 'active':
        return 'Open →';
      case 'configured':
        return 'Configured';
      case 'error':
        return 'Error';
      default:
        return 'Coming Soon';
    }
  }
</script>

<div class="min-h-screen p-4 md:p-8">
  <div class="max-w-4xl mx-auto flex flex-col gap-8">
    <!-- Header -->
    <header class="text-center">
      <h1
        class="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent"
      >
        Flow Sample
      </h1>
      <p class="text-white/50 mt-3 text-lg">Your data flow playground</p>
    </header>

    <!-- Flow Cards -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each flows as flow (flow.id)}
        {@const isActive = flow.stats?.status === 'active'}
        <a
          href={isActive ? flow.route : undefined}
          class="glass p-6 rounded-xl transition-all duration-300
                 {isActive
            ? 'hover:scale-105 hover:ring-2 hover:ring-white/20 cursor-pointer'
            : 'opacity-50 cursor-not-allowed'}"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-4xl">{flow.icon}</span>
            <div
              class="w-2 h-2 rounded-full {flow.stats?.status === 'active'
                ? 'bg-green-400 animate-pulse'
                : 'bg-white/20'}"
            ></div>
          </div>

          <h2 class="text-xl font-semibold text-white">{flow.name}</h2>
          <p class="text-white/50 text-sm mt-1">{flow.description}</p>

          {#if flow.stats && flow.stats.count > 0}
            <div class="flex gap-4 mt-4 pt-4 border-t border-white/10">
              <div class="text-center">
                <div class="text-lg font-bold text-white">{flow.stats.count}</div>
                <div class="text-xs text-white/40">Items</div>
              </div>
              {#if flow.stats.statusMessage}
                <div class="text-center">
                  <div class="text-lg font-bold text-white/80">{flow.stats.statusMessage}</div>
                  <div class="text-xs text-white/40">Info</div>
                </div>
              {/if}
            </div>
          {/if}

          {#if flow.stats}
            <div class="mt-4 text-xs {getStatusClass(flow.stats.status)} rounded px-2 py-1 inline-block">
              {getStatusLabel(flow.stats)}
            </div>
          {/if}
        </a>
      {/each}
    </section>

    <!-- Footer -->
    <footer class="text-center text-white/30 text-sm mt-8">
      Flow Sample — An improvisational data vignette
    </footer>
  </div>
</div>
