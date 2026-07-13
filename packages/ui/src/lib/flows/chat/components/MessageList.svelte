<script lang="ts">
  import { AsyncState, Badge } from '@lib/components';
  import DOMPurify from 'dompurify';
  import { marked } from 'marked';
  import { chatStore } from '../stores.svelte';

  let listContainer: HTMLDivElement;

  $effect(() => {
    void chatStore.messages;
    void chatStore.streamingContent;
    if (listContainer) listContainer.scrollTop = listContainer.scrollHeight;
  });

  marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(text: string): string {
    const processedText = text
      .replace(
        /<think>/g,
        '\n<details class="chat-thought"><summary>Thought process</summary><div>\n\n'
      )
      .replace(/<\/think>/g, '\n\n</div></details>\n');

    const rawHtml = marked.parse(processedText, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['details', 'summary'],
      ADD_ATTR: ['class'],
    });
  }

  function getModelDisplayName(message: { modelUsed?: string; providerUsed?: string }): string {
    if (!message.modelUsed) return '';

    const provider = message.providerUsed || '';
    const model = message.modelUsed;
    for (const group of chatStore.catalog) {
      if (group.provider !== provider) continue;
      const match = group.models.find((candidate) => candidate.id === model);
      if (match) return `${provider} / ${match.name}`;
    }

    const cleaned = model
      .replace(/:free$/, '')
      .split(/[-/]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return provider ? `${provider} / ${cleaned}` : cleaned;
  }
</script>

<div bind:this={listContainer} class="message-list" aria-live="polite">
  {#if chatStore.messages.length === 0 && !chatStore.isStreaming}
    <div class="message-list__empty">
      <AsyncState
        state="empty"
        title="How can I help you today?"
        message="Select a model from the top menu and send a message to begin."
      />
    </div>
  {/if}

  {#each chatStore.messages as message (message.id)}
    <article class="message" class:message--user={message.role === 'user'}>
      {#if message.role === 'assistant'}
        <span class="message__avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9.8 15.9 9 18.8l-.8-2.9a4.5 4.5 0 0 0-3.1-3.1L2.3 12l2.8-.8a4.5 4.5 0 0 0 3.1-3.1L9 5.3l.8 2.8a4.5 4.5 0 0 0 3.1 3.1l2.9.8-2.9.8a4.5 4.5 0 0 0-3.1 3.1Z"
            />
          </svg>
        </span>
      {/if}

      <div class="message__bubble">
        {#if message.role === 'user'}
          <p class="message__plain">{message.content}</p>
        {:else}
          <div class="message__markdown">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html renderMarkdown(message.content)}
          </div>
        {/if}

        {#if message.role === 'assistant' && message.modelUsed}
          <div class="message__model">
            <Badge>{getModelDisplayName(message)}</Badge>
          </div>
        {/if}
      </div>
    </article>
  {/each}

  {#if chatStore.isStreaming}
    <article class="message">
      <span class="message__avatar message__avatar--active" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9.8 15.9 9 18.8l-.8-2.9a4.5 4.5 0 0 0-3.1-3.1L2.3 12l2.8-.8a4.5 4.5 0 0 0 3.1-3.1L9 5.3l.8 2.8a4.5 4.5 0 0 0 3.1 3.1l2.9.8-2.9.8a4.5 4.5 0 0 0-3.1 3.1Z"
          />
        </svg>
      </span>

      <div class="message__bubble">
        {#if chatStore.streamingContent}
          <div class="message__markdown">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html renderMarkdown(chatStore.streamingContent)}
          </div>
          <span class="message__caret" aria-hidden="true"></span>
        {:else}
          <div class="typing-indicator" role="status" aria-label="Generating response">
            <span></span><span></span><span></span>
          </div>
        {/if}
      </div>
    </article>
  {/if}
</div>

<style>
  .message-list {
    display: grid;
    min-height: 0;
    flex: 1 1 auto;
    align-content: start;
    gap: 1.5rem;
    overflow-y: auto;
    padding: 1.5rem;
    scroll-behavior: smooth;
  }

  .message-list__empty {
    display: grid;
    min-height: 100%;
    place-items: center;
  }

  .message {
    display: flex;
    width: min(56rem, 100%);
    margin: 0 auto;
    align-items: flex-start;
  }

  .message--user {
    justify-content: flex-end;
  }

  .message__avatar {
    display: grid;
    width: 2rem;
    height: 2rem;
    flex: 0 0 2rem;
    margin: 0.25rem 0.75rem 0 0;
    place-items: center;
    border: 1px solid var(--ui-border-strong);
    border-radius: 50%;
    background: var(--ui-surface-raised);
    color: var(--ui-accent);
  }

  .message__avatar svg {
    width: 1rem;
    height: 1rem;
  }

  .message__avatar--active {
    animation: chat-pulse 1.5s ease-in-out infinite;
  }

  .message__bubble {
    max-width: min(75%, 46rem);
    padding: 0.875rem 1rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    background: var(--ui-surface);
    color: var(--ui-text);
  }

  .message--user .message__bubble {
    border-color: color-mix(in srgb, var(--ui-accent) 45%, var(--ui-border));
    background: var(--ui-accent-strong);
    color: var(--ui-accent-contrast);
  }

  .message__plain {
    margin: 0;
    white-space: pre-wrap;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .message__markdown {
    overflow-wrap: anywhere;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .message__markdown :global(:first-child) {
    margin-top: 0;
  }

  .message__markdown :global(:last-child) {
    margin-bottom: 0;
  }

  .message__markdown :global(pre) {
    max-width: 100%;
    overflow-x: auto;
    padding: 0.875rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.375rem;
    background: var(--ui-background);
  }

  .message__markdown :global(code) {
    color: var(--ui-accent);
  }

  .message__markdown :global(.chat-thought) {
    margin-bottom: 0.75rem;
    overflow: hidden;
    border: 1px solid var(--ui-border);
    border-radius: 0.375rem;
    background: var(--ui-surface-subtle);
  }

  .message__markdown :global(.chat-thought summary) {
    cursor: pointer;
    padding: 0.625rem 0.75rem;
    color: var(--ui-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .message__markdown :global(.chat-thought > div) {
    padding: 0.75rem;
    border-top: 1px solid var(--ui-border);
    color: var(--ui-text-muted);
    font-style: italic;
  }

  .message__model {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.75rem;
  }

  .message__caret {
    display: inline-block;
    width: 2px;
    height: 1rem;
    margin-left: 0.25rem;
    vertical-align: text-bottom;
    background: var(--ui-accent);
    animation: chat-pulse 1s ease-in-out infinite;
  }

  .typing-indicator {
    display: flex;
    min-width: 3.75rem;
    min-height: 1.5rem;
    align-items: center;
    gap: 0.375rem;
  }

  .typing-indicator span {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--ui-accent);
    animation: chat-bounce 900ms ease-in-out infinite;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 150ms;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 300ms;
  }

  @keyframes chat-pulse {
    50% {
      opacity: 0.45;
    }
  }

  @keyframes chat-bounce {
    50% {
      transform: translateY(-0.25rem);
    }
  }

  @media (max-width: 40rem) {
    .message-list {
      gap: 1rem;
      padding: 1rem 0.75rem;
    }

    .message__bubble {
      max-width: calc(100% - 2.75rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .message__avatar--active,
    .message__caret,
    .typing-indicator span {
      animation: none;
    }
  }
</style>
