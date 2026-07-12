<script lang="ts">
  import { chatStore } from '../stores.svelte';
  import { IconButton } from '@lib/components';

  let inputContent = $state('');
  let textareaEl: HTMLTextAreaElement;

  // Auto-resize textarea
  function handleInput() {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    if (!inputContent.trim() || chatStore.isLoading) return;

    chatStore.sendMessage(inputContent.trim());
    inputContent = '';

    // Reset textarea height instantly
    setTimeout(() => {
      if (textareaEl) textareaEl.style.height = 'auto';
    }, 0);
  }
</script>

<div class="p-4 bg-slate-900 border-t border-cosmic-800">
  <div
    class="max-w-4xl mx-auto relative flex items-end bg-slate-800 rounded-xl border border-slate-700 focus-within:border-cosmic-500 focus-within:shadow-glow transition-all"
  >
    <textarea
      bind:this={textareaEl}
      bind:value={inputContent}
      oninput={handleInput}
      onkeydown={handleKeydown}
      placeholder="Send a message..."
      class="w-full bg-transparent text-slate-200 resize-none outline-none py-3.5 pl-4 pr-12 max-h-[200px] overflow-y-auto scrollbar-thin text-sm leading-relaxed"
      rows="1"
      disabled={chatStore.isLoading}
    ></textarea>

    {#if chatStore.isStreaming}
      <IconButton
        label="Stop generating"
        variant="secondary"
        size="sm"
        onclick={() => chatStore.stopStreaming()}
        class="absolute right-2 bottom-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-3.5 h-3.5"
        >
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </svg>
      </IconButton>
    {:else}
      <IconButton
        label="Send message"
        variant="primary"
        size="sm"
        onclick={submit}
        disabled={!inputContent.trim() || chatStore.isLoading}
        class="absolute right-2 bottom-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-4 h-4"
        >
          <path
            d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z"
          />
        </svg>
      </IconButton>
    {/if}
  </div>
  <p class="text-center mt-2 text-[11px] text-slate-500 cursor-default select-none">
    AI can make mistakes. Consider verifying important information.
  </p>
</div>
