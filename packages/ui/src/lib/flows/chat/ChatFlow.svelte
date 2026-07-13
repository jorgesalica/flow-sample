<script lang="ts">
  import { FlowLayout, IconButton } from '@lib/components';
  import { onMount } from 'svelte';
  import ChatInput from './components/ChatInput.svelte';
  import MessageList from './components/MessageList.svelte';
  import ModelSelector from './components/ModelSelector.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import { chatStore, type ChatInitialData } from './stores.svelte';

  let { initialData }: { initialData: ChatInitialData } = $props();
  let isMobileMenuOpen = $state(false);

  onMount(() => {
    chatStore.hydrate(initialData);
  });
</script>

<FlowLayout fullBleed>
  <div class="chat-flow">
    <Sidebar bind:isMobileMenuOpen />

    <section class="chat-workspace" aria-label="Chat workspace">
      <header class="chat-toolbar">
        <div class="chat-toolbar__identity">
          <IconButton
            class="chat-toolbar__menu"
            label="Toggle conversation menu"
            onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-width="1.5" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </IconButton>
          <div>
            <h1>Chat</h1>
            <span>AI workspace</span>
          </div>
        </div>

        <ModelSelector />
      </header>

      <MessageList />
      <ChatInput />
    </section>

    {#if isMobileMenuOpen}
      <button
        class="chat-overlay"
        aria-label="Close conversation menu"
        onclick={() => (isMobileMenuOpen = false)}
      ></button>
    {/if}
  </div>
</FlowLayout>

<style>
  .chat-flow {
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
    min-width: 0;
    overflow: hidden;
    background: var(--ui-background);
    color: var(--ui-text);
  }

  .chat-workspace {
    position: relative;
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
  }

  .chat-toolbar {
    position: relative;
    z-index: 10;
    display: flex;
    min-height: 3.5rem;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-nav);
  }

  .chat-toolbar__identity {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.75rem;
  }

  .chat-toolbar__identity div {
    display: grid;
    min-width: 0;
    gap: 0.125rem;
  }

  .chat-toolbar h1 {
    margin: 0;
    font-size: 0.875rem;
    letter-spacing: 0;
  }

  .chat-toolbar span {
    color: var(--ui-text-muted);
    font-size: 0.7rem;
  }

  .chat-toolbar__identity :global(.chat-toolbar__menu) {
    display: none;
  }

  .chat-toolbar svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .chat-overlay {
    position: fixed;
    inset: var(--app-nav-height) 0 0;
    z-index: 15;
    display: none;
    border: 0;
    background: var(--ui-overlay);
  }

  @media (max-width: 48rem) {
    .chat-toolbar__identity :global(.chat-toolbar__menu),
    .chat-overlay {
      display: grid;
    }

    .chat-toolbar {
      padding-inline: 0.75rem;
    }

    .chat-toolbar__identity span {
      display: none;
    }
  }
</style>
