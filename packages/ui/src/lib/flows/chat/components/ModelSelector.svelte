<script lang="ts">
  import { chatStore } from '../stores.svelte';
  import type { ChatProviderGroup } from '@flows/shared';
  import { slide } from 'svelte/transition';

  let dropdownOpen = $state(false);

  function setMode(mode: 'rotation' | 'specific') {
    chatStore.setMode(mode);
    if (mode === 'rotation') {
      dropdownOpen = false;
    }
  }

  function selectModel(provider: string, modelId: string) {
    chatStore.setModel(`${provider}:${modelId}`);
    dropdownOpen = false;
  }

  function toggleDropdown() {
    if (chatStore.chatMode === 'specific') {
      dropdownOpen = !dropdownOpen;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.model-selector-container')) {
      dropdownOpen = false;
    }
  }

  function parseSelected(sel: string): { provider: string; model: string } {
    const idx = sel.indexOf(':');
    if (idx === -1) return { provider: '', model: sel };
    return { provider: sel.slice(0, idx), model: sel.slice(idx + 1) };
  }

  function getModelDisplayName(modelId: string, catalog: ChatProviderGroup[]): string {
    for (const group of catalog) {
      const found = group.models.find((m) => m.id === modelId);
      if (found) return found.name;
    }
    return modelId
      .split(/[-/]/)
      .filter((w) => w !== 'free' && w !== '')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  function tierColor(tier: string): string {
    switch (tier) {
      case 'very_high':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'high':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'medium':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'low':
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      default:
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  }

  function tierLabel(tier: string): string {
    switch (tier) {
      case 'very_high':
        return '★';
      case 'high':
        return 'H';
      case 'medium':
        return 'M';
      case 'low':
        return 'L';
      default:
        return '?';
    }
  }

  let selected = $derived(parseSelected(chatStore.selectedModel));
  let selectedDisplayName = $derived(getModelDisplayName(selected.model, chatStore.catalog));
</script>

<svelte:window on:click={handleClickOutside} />

<div class="model-selector-container relative flex items-center gap-1.5">
  <!-- Mode Toggle (labeled) -->
  <div
    class="flex bg-slate-800 rounded-lg border border-slate-700 overflow-hidden text-xs font-medium"
  >
    <button
      class="flex items-center gap-1 px-3 py-1.5 transition-all"
      class:bg-cosmic-600={chatStore.chatMode === 'rotation'}
      class:text-white={chatStore.chatMode === 'rotation'}
      class:text-slate-400={chatStore.chatMode !== 'rotation'}
      class:hover:text-slate-200={chatStore.chatMode !== 'rotation'}
      on:click={() => setMode('rotation')}
      title="Round-robin across free providers"
    >
      <svg
        class="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span class="hidden sm:inline">Rotate</span>
    </button>
    <button
      class="flex items-center gap-1 px-3 py-1.5 transition-all"
      class:bg-cosmic-600={chatStore.chatMode === 'specific'}
      class:text-white={chatStore.chatMode === 'specific'}
      class:text-slate-400={chatStore.chatMode !== 'specific'}
      class:hover:text-slate-200={chatStore.chatMode !== 'specific'}
      on:click={() => setMode('specific')}
      title="Choose a specific provider and model"
    >
      <svg
        class="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
        />
      </svg>
      <span class="hidden sm:inline">Specific</span>
    </button>
  </div>

  <!-- Badge / Selector -->
  {#if chatStore.chatMode === 'rotation'}
    <div
      class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs"
    >
      {#if chatStore.lastProvider}
        <span class="text-cosmic-400 font-medium capitalize">{chatStore.lastProvider}</span>
        <span class="text-slate-600">/</span>
        <span class="text-slate-300 truncate max-w-[140px]">
          {getModelDisplayName(chatStore.lastModel, chatStore.catalog)}
        </span>
      {:else}
        <span class="text-slate-400 italic">Auto-rotate</span>
      {/if}
    </div>
  {:else}
    <button
      class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 rounded-lg border border-slate-700 hover:border-cosmic-600 transition-colors text-xs cursor-pointer"
      on:click={toggleDropdown}
    >
      <span class="text-cosmic-400 font-medium capitalize">{selected.provider}</span>
      <span class="text-slate-600">/</span>
      <span class="text-slate-200 truncate max-w-[140px]">{selectedDisplayName}</span>
      <svg
        class="w-3 h-3 text-slate-400 ml-0.5 transition-transform"
        class:rotate-180={dropdownOpen}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  {/if}

  <!-- Dropdown -->
  {#if dropdownOpen}
    <div
      transition:slide={{ duration: 150 }}
      class="absolute top-full right-0 mt-1.5 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
    >
      <div class="max-h-[360px] overflow-y-auto scrollbar-thin">
        {#each chatStore.catalog as group (group.provider)}
          {#if group.models.length > 0}
            <div
              class="sticky top-0 px-3 py-2 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50"
            >
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                >{group.provider}</span
              >
            </div>

            {#each group.models as model (model.id)}
              {@const fullId = `${group.provider}:${model.id}`}
              {@const isSelected = chatStore.selectedModel === fullId}
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/50 transition-colors {isSelected
                  ? 'bg-cosmic-600/10'
                  : ''}"
                on:click={() => selectModel(group.provider, model.id)}
              >
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0 {isSelected
                    ? 'bg-cosmic-500'
                    : 'bg-transparent'}"
                ></span>

                <div class="flex-1 min-w-0">
                  <div class="text-sm text-slate-200 truncate">{model.name}</div>
                  {#if model.description}
                    <div class="text-[10px] text-slate-500 truncate">{model.description}</div>
                  {/if}
                </div>

                <span
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded border {tierColor(model.tier)}"
                  title={model.tier}
                >
                  {tierLabel(model.tier)}
                </span>
              </button>
            {/each}
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>
