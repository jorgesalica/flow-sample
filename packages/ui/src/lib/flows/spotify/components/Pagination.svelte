<script lang="ts">
  import { spotifyStore } from '../stores.svelte';
  import { loadTracks } from '../api';
  import { Button } from '@lib/components';

  let currentPage = $derived(spotifyStore.searchOptions.page || 1);
  let limit = $derived(spotifyStore.searchOptions.limit || 24);
  let total = $derived(spotifyStore.totalTracks);
  let totalPages = $derived(Math.ceil(total / limit));

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    loadTracks({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
</script>

{#if totalPages > 1}
  <div class="flex justify-center items-center gap-2 py-8">
    <Button
      onclick={() => goToPage(currentPage - 1)}
      disabled={currentPage === 1}
      variant="secondary"
    >
      Previous
    </Button>

    <div class="flex items-center gap-1 px-4 text-muted">
      <span class="font-semibold text-foreground">{currentPage}</span>
      <span>/</span>
      <span>{totalPages}</span>
    </div>

    <Button
      onclick={() => goToPage(currentPage + 1)}
      disabled={currentPage === totalPages}
      variant="secondary"
    >
      Next
    </Button>
  </div>
{/if}
