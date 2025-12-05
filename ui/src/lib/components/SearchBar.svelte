<script lang="ts">
  import { searchOptions } from '../stores';
  import { loadTracks } from '../api';

  let value = $state($searchOptions.q || '');
  let timer: ReturnType<typeof setTimeout> | null = null;

  function handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    value = val;
    
    // Debounced search
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      loadTracks({ q: val, page: 1 });
    }, 400);
  }

  function handleClear() {
    value = '';
    loadTracks({ q: '', page: 1 });
  }
</script>

<div class="relative w-full max-w-md">
  <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
    <span class="text-white/30 text-lg">🔍</span>
  </div>
  <input
    type="text"
    placeholder="Search tracks, artists, albums..."
    bind:value={value}
    oninput={handleInput}
    class="w-full glass pl-10 pr-10 py-2 rounded-xl border border-white/10 
           focus:border-purple-400 focus:ring-1 focus:ring-purple-400 
           bg-black/20 text-white placeholder-white/30 outline-none transition-all"
  />
  {#if value}
    <button
      onclick={handleClear}
      class="absolute inset-y-0 right-3 flex items-center text-white/30 hover:text-white transition-colors"
    >
      ✕
    </button>
  {/if}
</div>
