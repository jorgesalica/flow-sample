<script lang="ts">
  import type { GenreCount, SelectOption, YearCount } from '@flows/shared';
  import { Badge, Button } from '@lib/components';
  import { loadTracks } from '../api';
  import { spotifyStore } from '../stores.svelte';
  import FilterSelect from './FilterSelect.svelte';

  let { genres = [], years = [] }: { genres?: GenreCount[]; years?: YearCount[] } = $props();
  let isOpen = $state(false);
  let selectedGenre = $state(spotifyStore.searchOptions.genre || '');
  let selectedYear = $state(spotifyStore.searchOptions.year?.toString() || '');
  let sortBy = $state(spotifyStore.searchOptions.sortBy || 'added_at');
  let sortOrder = $state(spotifyStore.searchOptions.sortOrder || 'desc');

  const genreOptions = $derived<SelectOption[]>([
    { value: '', label: 'All Genres' },
    ...genres.map(({ genre, count }) => ({ value: genre, label: `${genre} (${count})` })),
  ]);
  const yearOptions = $derived<SelectOption[]>([
    { value: '', label: 'All Years' },
    ...years.map(({ year, count }) => ({ value: year.toString(), label: `${year} (${count})` })),
  ]);
  const sortOptions: SelectOption[] = [
    { value: 'added_at', label: 'Date Added' },
    { value: 'title', label: 'Title' },
  ];
  const orderOptions: SelectOption[] = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];
  const activeFilterCount = $derived(
    (selectedGenre ? 1 : 0) +
      (selectedYear ? 1 : 0) +
      (sortBy !== 'added_at' || sortOrder !== 'desc' ? 1 : 0)
  );

  function applyFilters() {
    loadTracks({
      genre: selectedGenre || undefined,
      year: selectedYear ? Number.parseInt(selectedYear, 10) : undefined,
      sortBy: sortBy as 'added_at' | 'title',
      sortOrder: sortOrder as 'asc' | 'desc',
      page: 1,
    });
    isOpen = false;
  }

  function clearFilters() {
    selectedGenre = '';
    selectedYear = '';
    sortBy = 'added_at';
    sortOrder = 'desc';
    loadTracks({ page: 1 });
  }
</script>

<div class="relative">
  <Button
    variant="secondary"
    onclick={() => (isOpen = !isOpen)}
    aria-expanded={isOpen}
    aria-controls="spotify-filter-panel"
  >
    Filters
    {#if activeFilterCount > 0}<Badge tone="info">{activeFilterCount}</Badge>{/if}
  </Button>

  {#if isOpen}
    <div id="spotify-filter-panel" class="spotify-filter-panel" aria-label="Spotify filters">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FilterSelect
          id="filter-genre"
          label="Genre"
          bind:value={selectedGenre}
          options={genreOptions}
        />
        <FilterSelect
          id="filter-year"
          label="Year"
          bind:value={selectedYear}
          options={yearOptions}
        />
        <FilterSelect
          id="filter-sortby"
          label="Sort By"
          bind:value={sortBy}
          options={sortOptions}
        />
        <FilterSelect
          id="filter-order"
          label="Order"
          bind:value={sortOrder}
          options={orderOptions}
        />
      </div>
      <div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
        <Button variant="ghost" onclick={clearFilters}>Clear all</Button>
        <Button onclick={applyFilters}>Apply filters</Button>
      </div>
    </div>
  {/if}
</div>

<style>
  .spotify-filter-panel {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    z-index: 55;
    width: min(32rem, calc(100vw - 2rem));
    padding: 1rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    background: var(--ui-surface);
    box-shadow: 0 1rem 2rem rgba(0, 0, 0, 0.35);
  }

  @media (max-width: 640px) {
    .spotify-filter-panel {
      position: fixed;
      top: 4.5rem;
      right: 1rem;
      bottom: auto;
      left: 1rem;
      width: auto;
      max-height: calc(100vh - 5.5rem);
      overflow-y: auto;
    }
  }
</style>
