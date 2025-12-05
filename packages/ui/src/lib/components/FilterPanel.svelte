<script lang="ts">
  import { onMount } from 'svelte';
  import { searchOptions } from '../stores';
  import { loadTracks } from '../api';
  import { ENDPOINTS } from '../config';

  // Local state for the panel
  let isOpen = $state(false);
  let genres: { genre: string; count: number }[] = $state([]);
  let years: { year: number; count: number }[] = $state([]);

  // Local filter values (synced with store)
  let selectedGenre = $state($searchOptions.genre || '');
  let selectedYear = $state($searchOptions.year?.toString() || '');
  let hasPreview = $state($searchOptions.hasPreview || false);
  let minPopularity = $state($searchOptions.minPopularity || 0);
  let sortBy = $state($searchOptions.sortBy || 'added_at');
  let sortOrder = $state($searchOptions.sortOrder || 'desc');

  // Count active filters
  let activeFilterCount = $derived(
    (selectedGenre ? 1 : 0) +
      (selectedYear ? 1 : 0) +
      (hasPreview ? 1 : 0) +
      (minPopularity > 0 ? 1 : 0) +
      (sortBy !== 'added_at' || sortOrder !== 'desc' ? 1 : 0),
  );

  onMount(async () => {
    try {
      const [genresRes, yearsRes] = await Promise.all([
        fetch(ENDPOINTS.GENRES),
        fetch(ENDPOINTS.YEARS),
      ]);
      if (genresRes.ok) genres = await genresRes.json();
      if (yearsRes.ok) years = await yearsRes.json();
    } catch (e) {
      console.error('Failed to load filter options', e);
    }
  });

  function applyFilters() {
    loadTracks({
      genre: selectedGenre || undefined,
      year: selectedYear ? parseInt(selectedYear) : undefined,
      hasPreview: hasPreview || undefined,
      minPopularity: minPopularity > 0 ? minPopularity : undefined,
      sortBy: sortBy as 'added_at' | 'popularity' | 'title',
      sortOrder: sortOrder as 'asc' | 'desc',
      page: 1,
    });
    isOpen = false;
  }

  function clearFilters() {
    selectedGenre = '';
    selectedYear = '';
    hasPreview = false;
    minPopularity = 0;
    sortBy = 'added_at';
    sortOrder = 'desc';
    loadTracks({ page: 1 });
    isOpen = false;
  }

  function togglePanel() {
    isOpen = !isOpen;
  }
</script>

<!-- Filter Button -->
<button
  onclick={togglePanel}
  class="glass px-4 py-2 rounded-xl border border-white/10 bg-slate-900 text-white outline-none cursor-pointer hover:border-white/30 transition-colors flex items-center gap-2"
>
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
    />
  </svg>
  <span>Filters</span>
  {#if activeFilterCount > 0}
    <span
      class="ml-1 px-1.5 py-0.5 text-[10px] bg-purple-500 rounded-full font-bold"
      >{activeFilterCount}</span
    >
  {/if}
  <svg
    class="w-4 h-4 transition-transform {isOpen ? 'rotate-180' : ''}"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
  </svg>
</button>

<!-- Expandable Panel -->
{#if isOpen}
  <div
    class="absolute top-full left-0 right-0 mt-2 p-4 rounded-xl border border-white/10 bg-slate-900 z-50 shadow-2xl"
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Genre Filter -->
      <div class="flex flex-col gap-1">
        <label for="filter-genre" class="text-xs text-white/50 uppercase tracking-wide">Genre</label>
        <select
          id="filter-genre"
          class="glass px-3 py-2 rounded-lg border border-white/10 bg-slate-800 text-white outline-none cursor-pointer text-sm"
          bind:value={selectedGenre}
        >
          <option value="" class="bg-slate-800">All Genres</option>
          {#each genres as g (g.genre)}
            <option value={g.genre} class="bg-slate-800">{g.genre} ({g.count})</option>
          {/each}
        </select>
      </div>

      <!-- Year Filter -->
      <div class="flex flex-col gap-1">
        <label for="filter-year" class="text-xs text-white/50 uppercase tracking-wide">Year</label>
        <select
          id="filter-year"
          class="glass px-3 py-2 rounded-lg border border-white/10 bg-slate-800 text-white outline-none cursor-pointer text-sm"
          bind:value={selectedYear}
        >
          <option value="" class="bg-slate-800">All Years</option>
          {#each years as y (y.year)}
            <option value={y.year.toString()} class="bg-slate-800">{y.year} ({y.count})</option>
          {/each}
        </select>
      </div>

      <!-- Sort By -->
      <div class="flex flex-col gap-1">
        <label for="filter-sortby" class="text-xs text-white/50 uppercase tracking-wide">Sort By</label>
        <select
          id="filter-sortby"
          class="glass px-3 py-2 rounded-lg border border-white/10 bg-slate-800 text-white outline-none cursor-pointer text-sm"
          bind:value={sortBy}
        >
          <option value="added_at" class="bg-slate-800">Date Added</option>
          <option value="popularity" class="bg-slate-800">Popularity</option>
          <option value="title" class="bg-slate-800">Title</option>
        </select>
      </div>

      <!-- Sort Order -->
      <div class="flex flex-col gap-1">
        <label for="filter-order" class="text-xs text-white/50 uppercase tracking-wide">Order</label>
        <select
          id="filter-order"
          class="glass px-3 py-2 rounded-lg border border-white/10 bg-slate-800 text-white outline-none cursor-pointer text-sm"
          bind:value={sortOrder}
        >
          <option value="desc" class="bg-slate-800">Descending</option>
          <option value="asc" class="bg-slate-800">Ascending</option>
        </select>
      </div>

      <!-- Min Popularity -->
      <div class="flex flex-col gap-1">
        <label for="filter-popularity" class="text-xs text-white/50 uppercase tracking-wide"
          >Min Popularity: {minPopularity}</label
        >
        <input
          id="filter-popularity"
          type="range"
          min="0"
          max="100"
          step="10"
          bind:value={minPopularity}
          class="w-full accent-purple-500"
        />
      </div>

      <!-- Has Preview Checkbox -->
      <div class="flex items-center gap-2 pt-5">
        <input
          type="checkbox"
          id="hasPreview"
          bind:checked={hasPreview}
          class="w-4 h-4 accent-purple-500 cursor-pointer"
        />
        <label for="hasPreview" class="text-sm text-white/80 cursor-pointer">
          Only with preview ▶️
        </label>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
      <button
        onclick={clearFilters}
        class="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
      >
        Clear All
      </button>
      <button
        onclick={applyFilters}
        class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
      >
        Apply Filters
      </button>
    </div>
  </div>
{/if}
