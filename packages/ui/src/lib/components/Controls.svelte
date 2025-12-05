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
    class="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors disabled:opacity-50 text-white"
  >
    Refresh
  </button>
  <button
    onclick={fetchFromSpotify}
    disabled={$isLoading}
    class="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50 text-white font-semibold shadow-lg shadow-purple-900/20"
  >
    {$isLoading ? 'Syncing...' : 'Sync with Spotify'}
  </button>
</div>
