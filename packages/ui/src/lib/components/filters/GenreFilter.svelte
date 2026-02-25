<script lang="ts">
  import { onMount } from 'svelte';
  import { searchOptions } from '@lib/stores';
  import { loadTracks } from '@lib/api';
  import { api } from '@lib/client';
  import type { GenreCount } from '@lib/types';

  let genres: GenreCount[] = $state([]);
  let selectedGenre = $state($searchOptions.genre || '');

  onMount(async () => {
    try {
      const { data, error } = await api.api.spotify.genres.get();
      if (!error && data) {
        genres = data as unknown as GenreCount[];
      }
    } catch (e) {
      console.error('Failed to load genres', e);
    }
  });

  function handleChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    selectedGenre = value;
    loadTracks({ genre: value || undefined, page: 1 });
  }
</script>

<select
  class="glass px-4 py-2 rounded-xl border border-white/10 bg-slate-900 text-white outline-none cursor-pointer hover:border-white/30 transition-colors"
  value={selectedGenre}
  onchange={handleChange}
>
  <option value="" class="bg-slate-800 text-white">All Genres</option>
  {#each genres as g (g.genre)}
    <option value={g.genre} class="bg-slate-800 text-white">{g.genre} ({g.count})</option>
  {/each}
</select>
