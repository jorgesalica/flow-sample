<script lang="ts">
  import Navbar from './Navbar.svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<Navbar />

<div class="min-h-screen pt-28 px-4 md:px-8 pb-8">
  <div class="max-w-7xl mx-auto">
    {@render children()}
  </div>
</div>
