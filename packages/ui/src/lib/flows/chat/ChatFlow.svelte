<script lang="ts">
  import Sidebar from './components/Sidebar.svelte';
  import MessageList from './components/MessageList.svelte';
  import ChatInput from './components/ChatInput.svelte';
  import ModelSelector from './components/ModelSelector.svelte';
  import { chatStore } from './stores';
  import FlowLayout from '../../components/layout/FlowLayout.svelte';

  let isMobileMenuOpen = false;

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }
</script>

<!-- Using absolute positioning override for the inner layout to maximize screen real estate, over the nav if possible -->
<FlowLayout>
  <div class="fixed inset-0 pt-16 flex bg-slate-950 overflow-hidden">
    <!-- Sidebar -->
    <Sidebar bind:isMobileMenuOpen />

    <!-- Main Chat Area -->
    <main class="flex-1 flex flex-col h-full bg-slate-950 relative">
      <!-- Sticky Header inside Chat Area -->
      <header
        class="h-14 flex items-center justify-between px-4 border-b border-cosmic-800/50 bg-slate-900/80 backdrop-blur-md z-10 shrink-0"
      >
        <div class="flex items-center gap-3">
          <button
            class="md:hidden text-slate-400 hover:text-white"
            aria-label="Toggle mobile menu"
            on:click={toggleMobileMenu}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <h1 class="text-lg font-semibold text-slate-200">Chat</h1>
        </div>

        <ModelSelector />
      </header>

      <!-- Error Banner -->
      {#if $chatStore.error}
        <div
          class="bg-red-500/10 border-l-4 border-red-500 p-3 mx-4 mt-4 shadow-md rounded-r-md shrink-0"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-300">
                {$chatStore.error}
              </p>
            </div>
          </div>
        </div>
      {/if}

      <MessageList />
      <ChatInput />
    </main>

    <!-- Overlay for mobile when sidebar is open -->
    {#if isMobileMenuOpen}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="fixed inset-0 bg-black/60 z-10 md:hidden"
        on:click={() => (isMobileMenuOpen = false)}
      ></div>
    {/if}
  </div>
</FlowLayout>
