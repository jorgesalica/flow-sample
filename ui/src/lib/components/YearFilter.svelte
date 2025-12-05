<script lang="ts">
  import { onMount } from 'svelte';
  import { searchOptions } from '../stores';
  import { loadTracks } from '../api';
  import { ENDPOINTS } from '../config';

  let years: { year: number; count: number }[] = $state([]);
  let selectedYear = $state($searchOptions.year?.toString() || '');

  onMount(async () => {
    try {
      const res = await fetch(ENDPOINTS.YEARS);
      if (res.ok) {
        years = await res.json();
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
  {#each years as y}
    <option value={y.year.toString()} class="bg-slate-800 text-white">{y.year} ({y.count})</option>
  {/each}
</select>
