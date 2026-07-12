<script lang="ts">
  import { Field, IconButton } from '@lib/components';
  import { loadTracks } from '../api';
  import { spotifyStore } from '../stores.svelte';

  let value = $state(spotifyStore.searchOptions.q || '');
  let timer: ReturnType<typeof setTimeout> | null = null;

  function handleInput(event: Event) {
    const nextValue = (event.target as HTMLInputElement).value;
    value = nextValue;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => loadTracks({ q: nextValue, page: 1 }), 400);
  }

  function handleClear() {
    if (timer) clearTimeout(timer);
    value = '';
    loadTracks({ q: '', page: 1 });
  }
</script>

<div class="spotify-search relative w-full max-w-md">
  <Field
    label="Search library"
    labelHidden
    type="search"
    placeholder="Search tracks, artists, albums..."
    bind:value
    oninput={handleInput}
  />
  {#if value}
    <IconButton label="Clear search" onclick={handleClear} size="sm" class="spotify-search__clear">
      &times;
    </IconButton>
  {/if}
</div>

<style>
  :global(.spotify-search .ui-field__control) {
    padding-right: 2.75rem;
  }

  :global(.spotify-search__clear) {
    position: absolute;
    top: 50%;
    right: 0.375rem;
    transform: translateY(-50%);
  }
</style>
