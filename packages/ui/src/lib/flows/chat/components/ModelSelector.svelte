<script lang="ts">
  import { chatStore } from '../stores';

  function handleSelect(e: Event) {
    const target = e.target as HTMLSelectElement;
    chatStore.setModel(target.value);
  }
</script>

<div class="flex items-center gap-2">
  <label for="model-select" class="text-sm text-slate-400 hidden sm:block">Model:</label>
  <select
    id="model-select"
    value={$chatStore.selectedModel}
    on:change={handleSelect}
    class="bg-slate-800 border border-cosmic-700 text-slate-200 text-sm rounded-lg focus:ring-cosmic-500 focus:border-cosmic-500 block w-full p-2 outline-none appearance-none pr-8 cursor-pointer relative"
    style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 0.5rem center; background-size: 1.25rem"
  >
    {#if $chatStore.models.length === 0}
      <option value="" disabled>Loading models...</option>
    {/if}
    {#each $chatStore.models as model (model.id)}
      <option value={model.id}>{model.name}</option>
    {/each}
  </select>
</div>
