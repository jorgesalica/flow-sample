<script lang="ts">
  import { spotifyStore } from '../stores.svelte';
  import { fetchFromSpotify, loadTracks, cancelSync } from '../api';
  import { Button } from '@lib/components';

  async function handleRefresh() {
    await loadTracks({ page: 1 });
  }
</script>

<div class="flex flex-wrap gap-2">
  <Button onclick={handleRefresh} loading={spotifyStore.isLoading} variant="secondary">
    Refresh
  </Button>

  {#if spotifyStore.isAuthenticated}
    <Button
      onclick={spotifyStore.isLoading ? cancelSync : fetchFromSpotify}
      variant={spotifyStore.isLoading ? 'danger' : 'primary'}
      title="Sync with Spotify to get latest tracks"
    >
      {spotifyStore.isLoading ? 'Cancel sync' : 'Sync with Spotify'}
    </Button>
  {:else}
    <Button href="/api/spotify/auth/login" rel="external" title="Connect your Spotify account">
      Connect Spotify
    </Button>
  {/if}
</div>
