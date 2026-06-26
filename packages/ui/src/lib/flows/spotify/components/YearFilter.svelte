<script lang="ts">
  import { onMount } from 'svelte';
  import { spotifyStore } from '../stores.svelte';
  import { loadTracks } from '../api';
  import { api } from '@lib/client';
  import type { YearCount } from '@flows/shared';

  let years: YearCount[] = $state([]);
  let selectedYear = $state(spotifyStore.searchOptions.year?.toString() || '');

  onMount(async () => {
    try {
      const { data, error } = await api.api.spotify.years.get();
      if (!error && data) {
        years = data as unknown as YearCount[];
      }
    } catch (e) {
      console.error('Failed to load years', e);
    }
  });

  function handleChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    selectedYear = value;
    const year = value ? parseInt(value) : undefined;
    loadTracks({ year, page: 1 });
  }
</script>

<select
  class="glass px-4 py-2 rounded-xl border border-white/10 bg-slate-900 text-white outline-none cursor-pointer hover:border-white/30 transition-colors"
  value={selectedYear}
  onchange={handleChange}
>
  <option value="" class="bg-slate-800 text-white">All Years</option>
  {#each years as y (y.year)}
    <option value={y.year.toString()} class="bg-slate-800 text-white">{y.year} ({y.count})</option>
  {/each}
</select>
