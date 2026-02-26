<script lang="ts">
  import { chatStore } from '../stores';
  import { afterUpdate } from 'svelte';

  let listContainer: HTMLDivElement;

  // Auto-scroll to bottom whenever messages update
  afterUpdate(() => {
    if (listContainer) {
      listContainer.scrollTop = listContainer.scrollHeight;
    }
  });

  // Helper to format basic markdown (bold, code segments) - very simple version
  function formatText(text: string) {
    // Prevent XSS mostly by escaping < and >
    let safe = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Bold **text**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Code `text`
    safe = safe.replace(
      /`([^`]+)`/g,
      '<code class="bg-black/30 px-1 py-0.5 rounded text-cosmic-300 font-mono text-sm">$1</code>'
    );

    // Code blocks ```text```
    safe = safe.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="bg-slate-900 border border-slate-700 p-3 rounded-md my-2 overflow-x-auto text-sm font-mono text-slate-300"><code>$2</code></pre>'
    );

    // Newlines to <br>
    safe = safe.replace(/\n/g, '<br/>');

    return safe;
  }
</script>

<div
  bind:this={listContainer}
  class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scroll-smooth"
>
  {#if $chatStore.messages.length === 0}
    <div class="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
      <div
        class="w-16 h-16 rounded-full bg-cosmic-900/50 flex items-center justify-center border border-cosmic-500/30"
      >
        <span class="text-3xl">✨</span>
      </div>
      <h3 class="text-xl font-medium text-slate-300">How can I help you today?</h3>
      <p class="max-w-md text-center text-sm">
        Select a model from the top menu and send a message to begin.
      </p>
    </div>
  {/if}

  {#each $chatStore.messages as msg (msg.id)}
    <div class={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <!-- Avatar for assistant -->
      {#if msg.role === 'assistant'}
        <div
          class="w-8 h-8 rounded-full bg-cosmic-700 flex-shrink-0 flex items-center justify-center mr-3 mt-1 shadow-glow-sm"
        >
          <span class="text-xs">🤖</span>
        </div>
      {/if}

      <div
        class={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 ${
          msg.role === 'user'
            ? 'bg-slate-700 text-white rounded-tr-sm shadow-md'
            : 'bg-transparent border border-cosmic-800 text-slate-200 rounded-tl-sm shadow-sm'
        }`}
      >
        <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-p:my-1">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html formatText(msg.content)}
        </div>

        {#if msg.role === 'assistant' && msg.modelUsed}
          <div class="mt-2 text-[10px] text-slate-500 flex justify-end">
            <span class="bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700"
              >{msg.modelUsed}</span
            >
          </div>
        {/if}
      </div>
    </div>
  {/each}

  {#if $chatStore.isLoading}
    <div class="flex w-full justify-start">
      <div
        class="w-8 h-8 rounded-full bg-cosmic-700 flex-shrink-0 flex items-center justify-center mr-3 shadow-glow-sm"
      >
        <span class="text-xs">🤖</span>
      </div>
      <div
        class="bg-transparent border border-cosmic-800 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1"
      >
        <div
          class="w-2 h-2 bg-cosmic-400 rounded-full animate-bounce"
          style="animation-delay: 0ms"
        ></div>
        <div
          class="w-2 h-2 bg-cosmic-400 rounded-full animate-bounce"
          style="animation-delay: 150ms"
        ></div>
        <div
          class="w-2 h-2 bg-cosmic-400 rounded-full animate-bounce"
          style="animation-delay: 300ms"
        ></div>
      </div>
    </div>
  {/if}
</div>
