<script lang="ts">
  import { onMount } from 'svelte';

  interface FlowInfo {
    id: string;
    name: string;
    icon: string;
    description: string;
    status: 'ready' | 'coming' | 'disabled';
    stats?: { label: string; value: string | number }[];
    route: string;
  }

  let flows: FlowInfo[] = $state([
    {
      id: 'spotify',
      name: 'Spotify Flow',
      icon: '🎵',
      description: 'Explore your liked songs, genres, and listening patterns',
      status: 'ready',
      stats: [],
      route: '#/spotify',
    },
    {
      id: 'lyrics',
      name: 'Lyrics Flow',
      icon: '📝',
      description: 'Analyze song lyrics and discover themes',
      status: 'coming',
      route: '#/lyrics',
    },
    {
      id: 'youtube',
      name: 'YouTube Flow',
      icon: '📺',
      description: 'Import and explore YouTube Music library',
      status: 'coming',
      route: '#/youtube',
    },
  ]);

  onMount(async () => {
    // Fetch Spotify stats if available
    try {
      const res = await fetch('/api/spotify/stats');
      if (res.ok) {
        const stats = await res.json();
        flows = flows.map((f) =>
          f.id === 'spotify'
            ? {
                ...f,
                stats: [
                  { label: 'Tracks', value: stats.totalTracks },
                  { label: 'Genres', value: stats.totalGenres },
                  { label: 'Top', value: stats.topGenres?.[0]?.genre || '—' },
                ],
              }
            : f,
        );
      }
    } catch {
      // API not available, that's ok
    }
  });
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
        <a
          href={flow.status === 'ready' ? flow.route : undefined}
          class="glass p-6 rounded-xl transition-all duration-300
                 {flow.status === 'ready'
            ? 'hover:scale-105 hover:ring-2 hover:ring-white/20 cursor-pointer'
            : 'opacity-50 cursor-not-allowed'}"
        >
          <div class="text-4xl mb-3">{flow.icon}</div>
          <h2 class="text-xl font-semibold text-white">{flow.name}</h2>
          <p class="text-white/50 text-sm mt-1">{flow.description}</p>

          {#if flow.stats && flow.stats.length > 0}
            <div class="flex gap-4 mt-4 pt-4 border-t border-white/10">
              {#each flow.stats as stat}
                <div class="text-center">
                  <div class="text-lg font-bold text-white">{stat.value}</div>
                  <div class="text-xs text-white/40">{stat.label}</div>
                </div>
              {/each}
            </div>
          {/if}

          {#if flow.status === 'coming'}
            <div
              class="mt-4 text-xs text-white/40 bg-white/5 rounded px-2 py-1 inline-block"
            >
              Coming Soon
            </div>
          {:else if flow.status === 'ready'}
            <div
              class="mt-4 text-xs text-green-400 bg-green-400/10 rounded px-2 py-1 inline-block"
            >
              Open →
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
