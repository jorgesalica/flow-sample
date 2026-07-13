<script lang="ts">
  import { IconButton } from '@lib/components';
  import { chatStore } from '../stores.svelte';

  let inputContent = $state('');
  let textareaEl: HTMLTextAreaElement;

  function handleInput(): void {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, 200)}px`;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function submit(): void {
    if (!inputContent.trim() || chatStore.isLoading) return;

    chatStore.sendMessage(inputContent.trim());
    inputContent = '';

    setTimeout(() => {
      if (textareaEl) textareaEl.style.height = 'auto';
    }, 0);
  }
</script>

<footer class="chat-composer">
  <div class="chat-composer__field">
    <label class="chat-composer__label" for="chat-message">Message</label>
    <textarea
      id="chat-message"
      bind:this={textareaEl}
      bind:value={inputContent}
      oninput={handleInput}
      onkeydown={handleKeydown}
      placeholder="Send a message..."
      rows="1"
      disabled={chatStore.isLoading}
    ></textarea>

    {#if chatStore.isStreaming}
      <IconButton
        label="Stop generating"
        variant="secondary"
        size="sm"
        onclick={() => chatStore.stopStreaming()}
        class="chat-composer__action"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
        class="chat-composer__action"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z"
          />
        </svg>
      </IconButton>
    {/if}
  </div>

  <p>AI can make mistakes. Consider verifying important information.</p>
</footer>

<style>
  .chat-composer {
    flex: 0 0 auto;
    padding: 1rem;
    border-top: 1px solid var(--ui-border);
    background: var(--ui-nav);
  }

  .chat-composer__field {
    position: relative;
    display: flex;
    width: min(56rem, 100%);
    min-height: 3rem;
    margin: 0 auto;
    align-items: flex-end;
    border: 1px solid var(--ui-border-strong);
    border-radius: 0.5rem;
    background: var(--ui-surface-raised);
  }

  .chat-composer__field:focus-within {
    border-color: var(--ui-focus);
    outline: 2px solid color-mix(in srgb, var(--ui-focus) 25%, transparent);
    outline-offset: 1px;
  }

  .chat-composer__label {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  textarea {
    width: 100%;
    max-height: 12.5rem;
    resize: none;
    overflow-y: auto;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--ui-text);
    padding: 0.875rem 3.25rem 0.875rem 1rem;
    font: inherit;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  textarea::placeholder {
    color: var(--ui-text-muted);
  }

  textarea:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .chat-composer__field :global(.chat-composer__action) {
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
  }

  .chat-composer svg {
    width: 1rem;
    height: 1rem;
  }

  .chat-composer p {
    margin: 0.5rem 0 0;
    color: var(--ui-text-muted);
    font-size: 0.7rem;
    text-align: center;
  }

  @media (max-width: 40rem) {
    .chat-composer {
      padding: 0.75rem;
    }
  }
</style>
