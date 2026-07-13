<script lang="ts">
  import GenreChart from './GenreChart.svelte';
  import DecadeChart from './DecadeChart.svelte';
  import type { TopStats } from '@lib/types';
  import { Panel } from '@lib/components';

  interface Props {
    stats: TopStats;
  }

  let { stats }: Props = $props();
</script>

{#if stats.genres.length > 0}
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <!-- Genre Chart -->
    <Panel element="section" ariaLabel="Top genres">
      <h3 class="mb-4 text-lg font-semibold">Top Genres</h3>
      <GenreChart data={stats.genres.slice(0, 6)} />
    </Panel>

    <!-- Decade/Timeline Chart -->
    <Panel element="section" ariaLabel="Track eras">
      <h3 class="mb-4 text-lg font-semibold">Eras</h3>
      <DecadeChart data={stats.decadeDistribution} />
    </Panel>
  </div>
{/if}
