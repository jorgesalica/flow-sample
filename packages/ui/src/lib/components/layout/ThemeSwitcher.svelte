<script lang="ts">
  import { onMount } from 'svelte';
  import {
    AppTheme,
    applyTheme,
    readStoredTheme,
    THEME_CHANGE_EVENT,
    THEME_STORAGE_KEY,
    themeOptions,
  } from '@lib/theme';

  let activeTheme: AppTheme = $state(AppTheme.GALAXY);

  onMount(() => {
    activeTheme = readStoredTheme(window.localStorage);
    applyTheme(document.documentElement, activeTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  });

  function selectTheme(theme: AppTheme): void {
    activeTheme = theme;
    applyTheme(document.documentElement, theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }
</script>

<div class="theme-switcher" role="group" aria-label="Color theme">
  {#each themeOptions as option (option.value)}
    <button
      type="button"
      class="theme-switcher__option"
      class:theme-switcher__option--active={activeTheme === option.value}
      aria-label={`${option.label} theme`}
      aria-pressed={activeTheme === option.value}
      title={`${option.label} theme`}
      onclick={() => selectTheme(option.value)}
    >
      <span class="theme-switcher__swatch" style={`--theme-swatch: ${option.color}`}></span>
    </button>
  {/each}
</div>

<style>
  .theme-switcher {
    display: inline-flex;
    flex: 0 0 auto;
    gap: 0.125rem;
    padding: 0.125rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    background: var(--ui-surface);
  }

  .theme-switcher__option {
    display: grid;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    place-items: center;
    border: 0;
    border-radius: 0.375rem;
    background: transparent;
  }

  .theme-switcher__option:hover,
  .theme-switcher__option--active {
    background: var(--ui-surface-raised);
  }

  .theme-switcher__option:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }

  .theme-switcher__swatch {
    width: 0.75rem;
    height: 0.75rem;
    border: 2px solid color-mix(in srgb, var(--theme-swatch) 65%, white);
    border-radius: 50%;
    background: var(--theme-swatch);
  }

  .theme-switcher__option--active .theme-switcher__swatch {
    box-shadow:
      0 0 0 2px var(--ui-surface-raised),
      0 0 0 3px var(--theme-swatch);
  }

  @media (max-width: 40rem) {
    .theme-switcher__option {
      width: 2.75rem;
      height: 2.75rem;
    }
  }
</style>
