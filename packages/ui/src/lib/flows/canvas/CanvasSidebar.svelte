<script lang="ts">
  import { canvasStore } from './stores.svelte';

  export let isMobileMenuOpen = false;

  function handleSelect(id: string) {
    canvasStore.loadCanvas(id);
    isMobileMenuOpen = false;
  }

  function handleNew() {
    canvasStore.clearActive();
    isMobileMenuOpen = false;
  }
</script>

<aside
  class="w-64 border-r border-cosmic-800/50 bg-slate-900/95 flex flex-col absolute inset-y-0 left-0 z-20 transform transition-transform duration-300 md:relative md:transform-none"
  class:-translate-x-full={!isMobileMenuOpen}
>
  <!-- Header / New Button -->
  <div class="p-4 border-b border-cosmic-800/50 flex-shrink-0">
    <button
      class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
      on:click={handleNew}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
          clip-rule="evenodd"
        />
      </svg>
      New Canvas
    </button>
  </div>

  <!-- Canvas List -->
  <div class="flex-1 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
    {#if canvasStore.isLoading}
      <div class="flex items-center justify-center p-8">
        <div
          class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
        ></div>
      </div>
    {:else if canvasStore.canvases.length === 0}
      <div class="p-4 text-center text-sm text-slate-500">
        No canvases yet.<br />Create one to start analyzing text!
      </div>
    {:else}
      <div class="space-y-1">
        {#each canvasStore.canvases as canvas (canvas.sourceId)}
          {@const isActive = canvasStore.activeCanvas?.sourceId === canvas.sourceId}
          <div class="group flex items-center gap-1">
            <button
              class="flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors truncate
                                   {isActive
                ? 'bg-primary-500/20 text-primary-300 font-medium'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
              on:click={() => handleSelect(canvas.sourceId)}
            >
              <div class="truncate text-sm font-medium">{canvas.meta?.title || 'Untitled'}</div>
              <div class="text-xs text-slate-500 truncate">{canvas.meta?.author || 'User'}</div>
            </button>

            <button
              class="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 flex-shrink-0"
              title="Delete Canvas"
              on:click={() => canvasStore.deleteCanvas(canvas.sourceId)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</aside>

<style>
  /* Add custom scrollbar styling if desired */
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--surface-800);
    border-radius: 4px;
  }
  .custom-scrollbar:hover::-webkit-scrollbar-thumb {
    background: var(--surface-700);
  }
</style>
