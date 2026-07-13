<script lang="ts">
  import { AsyncState, Button, IconButton } from '@lib/components';
  import { chatStore } from '../stores.svelte';

  let { isMobileMenuOpen = $bindable(false) }: { isMobileMenuOpen?: boolean } = $props();

  function selectConversation(id: string): void {
    chatStore.loadConversation(id);
    isMobileMenuOpen = false;
  }

  function newChat(): void {
    chatStore.startNewConversation();
    isMobileMenuOpen = false;
  }

  function handleDelete(event: Event, id: string): void {
    event.stopPropagation();
    chatStore.deleteConversation(id);
  }

  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
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

<aside class="chat-sidebar" class:chat-sidebar--open={isMobileMenuOpen} aria-label="Conversations">
  <div class="chat-sidebar__header">
    <Button onclick={newChat} class="chat-sidebar__new">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M9 3a1 1 0 0 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H3a1 1 0 1 1 0-2h6V3Z" />
      </svg>
      New chat
    </Button>
  </div>

  <div class="chat-sidebar__content">
    {#if chatStore.conversations.length === 0}
      <AsyncState state="empty" title="No history yet" message="Start a conversation." />
    {:else}
      <ul>
        {#each chatStore.conversations as conversation (conversation.id)}
          {@const isActive = chatStore.activeConversationId === conversation.id}
          <li>
            <button
              class="chat-sidebar__item"
              class:chat-sidebar__item--active={isActive}
              aria-current={isActive ? 'page' : undefined}
              title={conversation.title}
              onclick={() => selectConversation(conversation.id)}
            >
              <strong>{conversation.title}</strong>
              <span>{formatRelativeTime(conversation.updatedAt)}</span>
            </button>

            <IconButton
              label={`Delete conversation ${conversation.title}`}
              variant="danger"
              size="sm"
              class="chat-sidebar__delete"
              onclick={(event) => handleDelete(event, conversation.id)}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  d="M7 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h3a1 1 0 1 1 0 2h-1v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6H4a1 1 0 0 1 0-2h3V3Zm2 4a1 1 0 0 0-2 0v7a1 1 0 1 0 2 0V7Zm4 0a1 1 0 1 0-2 0v7a1 1 0 1 0 2 0V7Z"
                />
              </svg>
            </IconButton>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</aside>

<style>
  .chat-sidebar {
    z-index: 20;
    display: flex;
    width: 16rem;
    min-width: 16rem;
    height: 100%;
    flex-direction: column;
    border-right: 1px solid var(--ui-border);
    background: var(--ui-surface);
  }

  .chat-sidebar__header {
    flex: 0 0 auto;
    padding: 1rem;
    border-bottom: 1px solid var(--ui-border);
  }

  .chat-sidebar__header :global(.chat-sidebar__new) {
    width: 100%;
  }

  .chat-sidebar svg {
    width: 1rem;
    height: 1rem;
  }

  .chat-sidebar__content {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 0.5rem;
  }

  ul {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.25rem;
  }

  .chat-sidebar__item {
    display: grid;
    min-width: 0;
    min-height: 2.75rem;
    flex: 1 1 auto;
    gap: 0.125rem;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--ui-text-muted);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  .chat-sidebar__item:hover,
  .chat-sidebar__item--active {
    border-color: var(--ui-border);
    background: var(--ui-surface-raised);
    color: var(--ui-text);
  }

  .chat-sidebar__item--active {
    border-left-color: var(--ui-accent);
  }

  .chat-sidebar__item:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }

  .chat-sidebar__item strong,
  .chat-sidebar__item span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chat-sidebar__item strong {
    font-size: 0.875rem;
  }

  .chat-sidebar__item span {
    color: var(--ui-text-muted);
    font-size: 0.7rem;
  }

  .chat-sidebar__content :global(.chat-sidebar__delete) {
    opacity: 0;
  }

  li:hover :global(.chat-sidebar__delete),
  :global(.chat-sidebar__delete:focus-visible) {
    opacity: 1;
  }

  @media (max-width: 48rem) {
    .chat-sidebar {
      position: absolute;
      inset: 0 auto 0 0;
      transform: translateX(-100%);
      transition: transform 150ms ease;
    }

    .chat-sidebar--open {
      transform: translateX(0);
    }
  }

  @media (hover: none) {
    .chat-sidebar__content :global(.chat-sidebar__delete) {
      opacity: 1;
    }
  }
</style>
