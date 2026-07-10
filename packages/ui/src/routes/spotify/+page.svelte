<script lang="ts">
  import SpotifyFlow from '$lib/flows/spotify/SpotifyFlow.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<SpotifyFlow
  tracks={data.tracks}
  totalTracks={data.totalTracks}
  searchOptions={data.searchOptions}
  topStats={data.topStats}
  genres={data.genres}
  years={data.years}
  isAuthenticated={data.isAuthenticated}
/>
