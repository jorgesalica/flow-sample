<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import IconButton from './IconButton.svelte';

  let {
    title,
    subtitle,
    children,
    media,
    actions,
    footer,
    onclose,
    size = 'md',
  }: {
    title: string;
    subtitle?: string;
    children: Snippet;
    media?: Snippet;
    actions?: Snippet;
    footer?: Snippet;
    onclose: () => void;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  const titleId = $props.id();
  let dialogElement: HTMLElement;

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function getFocusableElements(): HTMLElement[] {
    return Array.from(dialogElement.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true'
    );
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onclose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogElement.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  onMount(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstFocusableElement = getFocusableElements()[0];
    (firstFocusableElement ?? dialogElement).focus();

    return () => previouslyFocused?.focus();
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="ui-modal-backdrop"
  role="presentation"
  onclick={(event) => event.currentTarget === event.target && onclose()}
>
  <div
    class="ui-modal ui-modal--{size}"
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
    bind:this={dialogElement}
  >
    <header class="ui-modal__header">
      {#if media}<div class="ui-modal__media">{@render media()}</div>{/if}
      <div class="ui-modal__heading">
        <h2 id={titleId}>{title}</h2>
        {#if subtitle}<p>{subtitle}</p>{/if}
      </div>
      <div class="ui-modal__actions">
        {#if actions}{@render actions()}{/if}
        <IconButton label="Close" variant="secondary" onclick={onclose}>
          <span aria-hidden="true">×</span>
        </IconButton>
      </div>
    </header>
    <div class="ui-modal__body">{@render children()}</div>
    {#if footer}<footer class="ui-modal__footer">{@render footer()}</footer>{/if}
  </div>
</div>
