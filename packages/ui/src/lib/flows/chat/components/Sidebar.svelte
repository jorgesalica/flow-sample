<script lang="ts">
  import { chatStore } from '../stores.svelte';

  let { isMobileMenuOpen = $bindable(false) }: { isMobileMenuOpen?: boolean } = $props();

  function selectConversation(id: string) {
    chatStore.loadConversation(id);
    isMobileMenuOpen = false;
  }

  function newChat() {
    chatStore.startNewConversation();
    isMobileMenuOpen = false;
  }

  function handleDelete(e: Event, id: string) {
    e.stopPropagation();
    chatStore.deleteConversation(id);
  }

  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }
</script>

<div
  class={`flex flex-col h-full bg-slate-900 border-r border-cosmic-800 transition-all duration-300 ${isMobileMenuOpen ? 'w-64 absolute z-20 h-full' : 'hidden md:flex w-64'}`}
>
  <div class="p-4 border-b border-cosmic-800">
    <button
      onclick={newChat}
      class="w-full flex items-center justify-center gap-2 bg-cosmic-600 hover:bg-cosmic-500 text-white py-2 px-4 rounded-lg transition-colors shadow-glow"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      New Chat
    </button>
  </div>

  <div class="flex-1 overflow-y-auto p-2 scrollbar-thin">
    {#if chatStore.conversations.length === 0}
      <div class="text-slate-500 text-center py-8 text-sm px-2">
        No history yet. Start a conversation!
      </div>
    {/if}

    <ul class="space-y-0.5">
      {#each chatStore.conversations as conv (conv.id)}
        <li class="group">
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onclick={() => selectConversation(conv.id)}
            class={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-all cursor-pointer ${
              chatStore.activeConversationId === conv.id
                ? 'bg-cosmic-800/70 text-white border border-cosmic-600/30'
                : 'text-slate-300 hover:bg-slate-800/70'
            }`}
            title={conv.title}
          >
            <svg
              class="w-3.5 h-3.5 shrink-0 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.671 1.09-.085 2.17-.207 3.238-.364 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>

            <div class="min-w-0 flex-1">
              <div class="truncate">{conv.title}</div>
              <div class="text-[10px] text-slate-500 mt-0.5">
                {formatRelativeTime(conv.updatedAt)}
              </div>
            </div>

            <!-- Delete button (visible on hover) -->
            <button
              class="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-slate-500 transition-all"
              onclick={(e) => handleDelete(e, conv.id)}
              title="Delete conversation"
            >
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          </div>
        </li>
      {/each}
    </ul>
  </div>
</div>
