<script lang="ts">
  import type { Snippet } from 'svelte';
  import Navbar from './Navbar.svelte';

  interface Props {
    children: Snippet;
    currentPath?: string;
  }

  let { children, currentPath }: Props = $props();
</script>

<div class="app-shell">
  <a class="app-shell__skip-link" href="#main-content">Skip to content</a>
  <Navbar {currentPath} />

  <main id="main-content" class="app-shell__main" tabindex="-1">
    <div class="app-shell__content">
      {@render children()}
    </div>
  </main>
</div>

<style>
  .app-shell {
    min-height: 100dvh;
  }

  .app-shell__skip-link {
    position: fixed;
    top: 0.5rem;
    left: 0.75rem;
    z-index: 100;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    background: var(--ui-accent-strong);
    color: white;
    font-weight: 700;
    text-decoration: none;
    transform: translateY(calc(-100% - 1rem));
    transition: transform 150ms ease;
  }

  .app-shell__skip-link:focus {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
    transform: translateY(0);
  }

  .app-shell__main {
    min-height: 100dvh;
    padding: calc(var(--app-nav-height) + 1.5rem) clamp(1rem, 3vw, 2rem) 2rem;
  }

  .app-shell__main:focus {
    outline: none;
  }

  .app-shell__content {
    width: min(80rem, 100%);
    margin: 0 auto;
  }

  @media (max-width: 640px) {
    .app-shell__main {
      padding-top: calc(var(--app-nav-height) + 1rem);
      padding-bottom: 1.5rem;
    }
  }
</style>
