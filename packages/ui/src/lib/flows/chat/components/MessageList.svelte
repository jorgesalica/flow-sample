<script lang="ts">
  import { chatStore } from '../stores';
  import { afterUpdate } from 'svelte';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  let listContainer: HTMLDivElement;

  // Auto-scroll to bottom whenever messages update
  afterUpdate(() => {
    if (listContainer) {
      listContainer.scrollTop = listContainer.scrollHeight;
    }
  });

  // Configure marked for clean output
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  /** Render markdown → sanitized HTML. */
  function renderMarkdown(text: string): string {
    // Transform <think> tags into a collapsible details block
    const processedText = text
      .replace(
        /<think>/g,
        '\n<details class="mb-3 border border-slate-700 rounded-md bg-slate-800/40 overflow-hidden"><summary class="px-3 py-2 cursor-pointer text-[10px] uppercase tracking-wider font-semibold text-slate-400 hover:text-slate-300 bg-slate-800/80 select-none flex items-center gap-2"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Thought Process</summary><div class="px-4 py-3 text-sm text-slate-400 border-t border-slate-700/50 italic">\n\n'
      )
      .replace(/<\/think>/g, '\n\n</div></details>\n');

    const rawHtml = marked.parse(processedText, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['details', 'summary'],
      ADD_ATTR: ['class'],
    });
  }

  function getModelDisplayName(msg: { modelUsed?: string; providerUsed?: string }): string {
    if (!msg.modelUsed) return '';
    const provider = msg.providerUsed || '';
    const model = msg.modelUsed || '';

    // Try to find human-readable name from catalog
    for (const group of $chatStore.catalog) {
      if (group.provider === provider) {
        const found = group.models.find((m) => m.id === model);
        if (found) return `${provider} / ${found.name}`;
      }
    }
    // Fallback: clean ID
    const cleaned = model
      .replace(/:free$/, '')
      .split(/[-/]/)
      .filter((w) => w !== '')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return provider ? `${provider} / ${cleaned}` : cleaned;
  }
</script>

<div
  bind:this={listContainer}
  class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scroll-smooth"
>
  {#if $chatStore.messages.length === 0 && !$chatStore.isStreaming}
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
          <svg
            class="w-4 h-4 text-cosmic-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
        </div>
      {/if}

      <div
        class={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 ${
          msg.role === 'user'
            ? 'bg-slate-700 text-white rounded-tr-sm shadow-md'
            : 'bg-transparent border border-cosmic-800 text-slate-200 rounded-tl-sm shadow-sm'
        }`}
      >
        {#if msg.role === 'user'}
          <p class="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        {:else}
          <div
            class="prose prose-invert prose-sm max-w-none leading-relaxed prose-p:my-1 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-code:text-cosmic-300 prose-code:before:content-[''] prose-code:after:content-['']"
          >
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html renderMarkdown(msg.content)}
          </div>
        {/if}

        {#if msg.role === 'assistant' && msg.modelUsed}
          <div class="mt-2 text-[10px] text-slate-500 flex justify-end">
            <span class="bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 capitalize">
              {getModelDisplayName(msg)}
            </span>
          </div>
        {/if}
      </div>
    </div>
  {/each}

  <!-- Streaming message (in progress) -->
  {#if $chatStore.isStreaming}
    <div class="flex w-full justify-start">
      <div
        class="w-8 h-8 rounded-full bg-cosmic-700 flex-shrink-0 flex items-center justify-center mr-3 mt-1 shadow-glow-sm"
      >
        <svg
          class="w-4 h-4 text-cosmic-300 animate-pulse"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
          />
        </svg>
      </div>
      <div
        class="max-w-[85%] md:max-w-[75%] bg-transparent border border-cosmic-800 rounded-2xl rounded-tl-sm px-5 py-3 shadow-sm"
      >
        {#if $chatStore.streamingContent}
          <div
            class="prose prose-invert prose-sm max-w-none leading-relaxed prose-p:my-1 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-code:text-cosmic-300 prose-code:before:content-[''] prose-code:after:content-['']"
          >
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html renderMarkdown($chatStore.streamingContent)}
          </div>
          <span class="inline-block w-0.5 h-4 bg-cosmic-400 animate-pulse ml-0.5 align-text-bottom"
          ></span>
        {:else}
          <div class="flex items-center gap-1.5 py-1">
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
        {/if}
      </div>
    </div>
  {/if}
</div>
