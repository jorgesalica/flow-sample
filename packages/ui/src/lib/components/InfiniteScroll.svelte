<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { hasMore, isLoading, onLoadMore } = $props<{
    hasMore: boolean;
    isLoading: boolean;
    onLoadMore: () => void;
  }>();

  let observer: IntersectionObserver;
  let element: HTMLDivElement;

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );

    if (element) {
      observer.observe(element);
    }
  });

  onDestroy(() => {
    if (observer) {
      observer.disconnect();
    }
  });
</script>

<div bind:this={element} class="h-4 w-full flex justify-center p-4">
  {#if isLoading}
    <div class="flex gap-1">
      <div class="w-2 h-2 rounded-full bg-purple-500 animate-bounce"></div>
      <div class="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-.3s]"></div>
      <div class="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-.5s]"></div>
    </div>
  {/if}
</div>
