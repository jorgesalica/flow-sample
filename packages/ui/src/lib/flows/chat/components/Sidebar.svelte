<script lang="ts">
  import { chatStore } from '../stores';
  import { onMount } from 'svelte';

  export let isMobileMenuOpen = false;

  // Load initial conversations list on mount
  onMount(() => {
    chatStore.init();
  });

  function selectConversation(id: string) {
    chatStore.loadConversation(id);
    isMobileMenuOpen = false;
  }

  function newChat() {
    chatStore.startNewConversation();
    isMobileMenuOpen = false;
  }
</script>

<div
  class={`flex flex-col h-full bg-slate-900 border-r border-cosmic-800 transition-all duration-300 ${isMobileMenuOpen ? 'w-64 absolute z-20 h-full' : 'hidden md:flex w-64'}`}
>
  <div class="p-4 border-b border-cosmic-800">
    <button
      on:click={newChat}
      class="w-full flex items-center justify-center gap-2 bg-cosmic-600 hover:bg-cosmic-500 text-white py-2 px-4 rounded-lg transition-colors shadow-glow"
    >
      <span class="text-xl">+</span> New Chat
    </button>
  </div>

  <div class="flex-1 overflow-y-auto p-2 scrollbar-thin">
    {#if $chatStore.conversations.length === 0}
      <div class="text-slate-500 text-center py-8 text-sm px-2">
        No history yet. Start a conversation!
      </div>
    {/if}

    <ul class="space-y-1">
      {#each $chatStore.conversations as conv (conv.id)}
        <li>
          <button
            on:click={() => selectConversation(conv.id)}
            class={`w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
              $chatStore.activeConversationId === conv.id
                ? 'bg-cosmic-800 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title={conv.title}
          >
            {conv.title}
          </button>
        </li>
      {/each}
    </ul>
  </div>
</div>
