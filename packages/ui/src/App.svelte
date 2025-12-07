<script lang="ts">
  import { Landing, SpotifyFlow } from './lib/pages';
  import { Toaster } from './lib/toast';

  // Simple hash-based routing
  let currentRoute = $state(window.location.hash || '#/');

  $effect(() => {
    const handleHashChange = () => {
      currentRoute = window.location.hash || '#/';
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });
</script>

<Toaster />

{#if currentRoute === '#/spotify'}
  <SpotifyFlow />
{:else}
  <Landing />
{/if}
