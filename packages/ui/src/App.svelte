<script lang="ts">
  import { Landing } from './lib/pages';
  import { Toaster } from './lib/toast';
  import { getFlows } from './lib/flows';

  // Simple hash-based routing
  let currentRoute = $state(window.location.hash || '#/');

  $effect(() => {
    const handleHashChange = () => {
      currentRoute = window.location.hash || '#/';
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });

  // Find the matching flow for the current route
  const matchedFlow = $derived(getFlows().find((f) => f.route === currentRoute));
  const FlowComponent = $derived(matchedFlow?.component);
</script>

<Toaster />

{#if FlowComponent}
  <FlowComponent />
{:else}
  <Landing />
{/if}
