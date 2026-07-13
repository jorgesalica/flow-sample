<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    currentPath?: string;
  }

  const navigationItems = [
    { href: '/spotify', label: 'Spotify' },
    { href: '/lyrics', label: 'Lyrics' },
    { href: '/canvas', label: 'Canvas' },
    { href: '/trading', label: 'Trading' },
    { href: '/chat', label: 'Chat' },
  ] as const;

  let { currentPath }: Props = $props();
  let browserPath = $state('');
  const activePath = $derived(currentPath ?? browserPath);

  onMount(() => {
    browserPath = window.location.pathname;
  });

  function isActive(href: string): boolean {
    return activePath === href || activePath.startsWith(`${href}/`);
  }
</script>

<nav class="app-navbar" aria-label="Primary navigation">
  <div class="app-navbar__inner">
    <a
      href="/"
      class="app-navbar__brand"
      aria-label="Cosmic Flow home"
      aria-current={activePath === '/' ? 'page' : undefined}
    >
      <img src="/favicon.png" alt="Cosmic Flow logo" class="app-navbar__logo" />
      <span class="app-navbar__wordmark">Cosmic Flow</span>
    </a>

    <div class="app-navbar__scroll">
      <div class="app-navbar__links">
        {#each navigationItems as item (item.href)}
          <a
            href={item.href}
            class="app-navbar__link"
            class:app-navbar__link--active={isActive(item.href)}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            {item.label}
          </a>
        {/each}
      </div>
    </div>
  </div>
</nav>

<style>
  .app-navbar {
    position: fixed;
    inset: 0 0 auto;
    z-index: 50;
    height: var(--app-nav-height);
    border-bottom: 1px solid var(--ui-border);
    background: rgba(10, 14, 23, 0.94);
    backdrop-filter: blur(14px);
  }

  .app-navbar__inner {
    display: flex;
    width: min(80rem, 100%);
    height: 100%;
    margin: 0 auto;
    align-items: center;
    gap: 1.5rem;
    padding: 0 clamp(1rem, 3vw, 2rem);
  }

  .app-navbar__brand {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.75rem;
    color: var(--ui-text);
    text-decoration: none;
  }

  .app-navbar__brand:focus-visible,
  .app-navbar__link:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 3px;
  }

  .app-navbar__logo {
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    object-fit: cover;
  }

  .app-navbar__wordmark {
    font-size: 1rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .app-navbar__scroll {
    min-width: 0;
    height: 100%;
    flex: 1 1 auto;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .app-navbar__scroll::-webkit-scrollbar {
    display: none;
  }

  .app-navbar__links {
    display: flex;
    width: max-content;
    min-width: 100%;
    height: 100%;
    align-items: stretch;
    justify-content: flex-end;
  }

  .app-navbar__link {
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 0 0.75rem;
    color: var(--ui-text-muted);
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition: color 150ms ease;
  }

  .app-navbar__link::after {
    position: absolute;
    right: 0.75rem;
    bottom: 0;
    left: 0.75rem;
    height: 2px;
    background: var(--ui-accent);
    content: '';
    opacity: 0;
    transform: scaleX(0.5);
    transition:
      opacity 150ms ease,
      transform 150ms ease;
  }

  .app-navbar__link:hover,
  .app-navbar__link--active {
    color: var(--ui-text);
  }

  .app-navbar__link--active::after {
    opacity: 1;
    transform: scaleX(1);
  }

  @media (max-width: 640px) {
    .app-navbar__inner {
      gap: 0.5rem;
      padding: 0 0.75rem;
    }

    .app-navbar__wordmark {
      display: none;
    }

    .app-navbar__links {
      justify-content: flex-start;
    }

    .app-navbar__link {
      padding: 0 0.625rem;
      font-size: 0.75rem;
    }

    .app-navbar__link::after {
      right: 0.625rem;
      left: 0.625rem;
    }
  }
</style>
