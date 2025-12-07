<script lang="ts">
  import type { TopStats } from '../types';

  interface Props {
    stats: TopStats;
  }

  let { stats }: Props = $props();
</script>

<header class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
  <div>
    <a
      href="#/"
      class="text-white/50 hover:text-white text-sm flex items-center gap-1 mb-2 transition-colors group"
    >
      <span class="group-hover:-translate-x-1 transition-transform">←</span> Back to Flows
    </a>
    <h1 class="text-4xl md:text-5xl font-bold text-aurora">Spotify Flow</h1>
    <p class="text-white/40 text-sm mt-1">Your music library, visualized</p>
  </div>

  <!-- Stats Panel (Compact) -->
  <div class="flex gap-6 md:gap-10">
    <div class="text-right">
      <div class="text-3xl font-bold text-aurora">{stats.total}</div>
      <div class="text-xs text-white/40 uppercase tracking-widest">Tracks</div>
    </div>
    <div class="text-right">
      <div class="text-xl font-semibold text-white truncate max-w-[150px]">
        {stats.topGenre}
      </div>
      <div class="text-xs text-white/40 uppercase tracking-widest">Top Genre</div>
    </div>
  </div>
</header>
