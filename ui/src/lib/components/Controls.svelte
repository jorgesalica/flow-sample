<script lang="ts">
  import { filter, isLoading, tracks } from '../stores';
  import { loadSavedData, fetchFromSpotify } from '../api';
  import type { TimeFilter } from '../types';

  const filters: { value: TimeFilter; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
  ];
</script>

<section class="glass p-4 flex flex-wrap items-center gap-4">
  <div class="flex flex-col gap-1">
    <span class="text-xs text-white/50 uppercase tracking-wider">Time Filter</span>
    <select
      bind:value={$filter}
      class="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
    >
      {#each filters as f (f.value)}
        <option value={f.value} class="bg-slate-800">{f.label}</option>
      {/each}
    </select>
  </div>

  <div class="flex flex-col gap-1">
    <span class="text-xs text-white/50 uppercase tracking-wider">Actions</span>
    <div class="flex gap-2">
      <button
        onclick={loadSavedData}
        disabled={$isLoading}
        class="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors disabled:opacity-50"
      >
        Load saved
      </button>
      <button
        onclick={fetchFromSpotify}
        disabled={$isLoading}
        class="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50"
      >
        {$isLoading ? 'Loading...' : 'Fetch from Spotify'}
      </button>
    </div>
  </div>

  <div class="flex items-center gap-2 ml-auto">
    <span class="text-xs text-white/50">Tracks:</span>
    <span class="px-2 py-1 bg-white/10 rounded text-sm">{$tracks.length}</span>
  </div>
</section>
