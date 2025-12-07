<script lang="ts">
  import { GenreChart, DecadeChart } from './index';
  import type { TopStats } from '../types';

  interface Props {
    stats: TopStats;
  }

  let { stats }: Props = $props();
</script>

{#if stats.genres.length > 0}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Genre Chart -->
    <div class="glass glass-hover p-6">
      <h3 class="text-lg font-semibold text-white/90 mb-4">Top Genres</h3>
      <GenreChart data={stats.genres.slice(0, 6)} />
    </div>

    <!-- Decade/Timeline Chart -->
    <div class="glass glass-hover p-6">
      <h3 class="text-lg font-semibold text-white/90 mb-4">Eras</h3>
      <DecadeChart data={stats.decadeDistribution} />
    </div>
  </div>
{/if}
