<script lang="ts">
  import { isLoading } from '../stores';
  import { fetchFromSpotify, loadTracks } from '../api';

  async function handleRefresh() {
    await loadTracks({ page: 1 });
  }
</script>

<div class="flex gap-2">
  <button
    onclick={handleRefresh}
    disabled={$isLoading}
    class="px-4 py-2 glass hover:bg-nebula/20 rounded-lg transition-colors disabled:opacity-50 text-cosmic"
  >
    Refresh
  </button>
  <button
    onclick={fetchFromSpotify}
    disabled={$isLoading}
    class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {$isLoading ? 'Syncing...' : 'Sync with Spotify'}
  </button>
</div>
