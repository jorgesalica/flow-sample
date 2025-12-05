<script lang="ts">
  import { searchOptions, totalTracks } from '../stores';
  import { loadTracks } from '../api';

  let currentPage = $derived($searchOptions.page || 1);
  let limit = $derived($searchOptions.limit || 24);
  let total = $derived($totalTracks);
  let totalPages = $derived(Math.ceil(total / limit));

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    loadTracks({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
</script>

{#if totalPages > 1}
  <div class="flex justify-center items-center gap-2 py-8">
    <button
      onclick={() => goToPage(currentPage - 1)}
      disabled={currentPage === 1}
      class="px-4 py-2 glass rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
    >
      ← Previous
    </button>

    <div class="flex items-center gap-1 px-4 text-white/50">
      <span class="font-semibold text-white">{currentPage}</span>
      <span>/</span>
      <span>{totalPages}</span>
    </div>

    <button
      onclick={() => goToPage(currentPage + 1)}
      disabled={currentPage === totalPages}
      class="px-4 py-2 glass rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
    >
      Next →
    </button>
  </div>
{/if}
