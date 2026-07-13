<script lang="ts">
  import { Badge } from '@lib/components';
  import type { FlowStats } from '@lib/flows';
  import type { FlowCardModel } from '../types';

  let { flow }: { flow: FlowCardModel } = $props();

  const isClickable = $derived(
    flow.stats.status === 'active' || flow.stats.status === 'configured'
  );

  function getStatusTone(status: FlowStats['status']): 'success' | 'info' | 'danger' | 'neutral' {
    switch (status) {
      case 'active':
        return 'success';
      case 'configured':
        return 'info';
      case 'error':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  function getStatusLabel(stats: FlowStats): string {
    if (stats.statusMessage) return stats.statusMessage;

    switch (stats.status) {
      case 'active':
        return 'Active';
      case 'configured':
        return 'Configured';
      case 'error':
        return 'Error';
      default:
        return 'Unavailable';
    }
  }
</script>

{#snippet cardContent()}
  <header class="flow-card__header">
    <span class="flow-card__icon" aria-hidden="true">{flow.icon}</span>
    <Badge tone={getStatusTone(flow.stats.status)}>{getStatusLabel(flow.stats)}</Badge>
  </header>

  <div class="flow-card__body">
    <h2>{flow.name}</h2>
    <p>{flow.description}</p>
  </div>

  <footer class="flow-card__footer">
    {#if flow.stats.count > 0}
      <span class="flow-card__count">
        <strong>{flow.stats.count}</strong>
        <span>Items</span>
      </span>
    {:else}
      <span></span>
    {/if}

    {#if isClickable}
      <span class="flow-card__action">Open flow <span aria-hidden="true">→</span></span>
    {/if}
  </footer>
{/snippet}

{#if isClickable}
  <a class="flow-card flow-card--clickable" href={flow.route} aria-label={`Open ${flow.name}`}>
    {@render cardContent()}
  </a>
{:else}
  <article
    class="flow-card flow-card--disabled"
    data-state="unavailable"
    aria-label={`${flow.name}: ${getStatusLabel(flow.stats)}`}
  >
    {@render cardContent()}
  </article>
{/if}

<style>
  .flow-card {
    display: flex;
    min-width: 0;
    min-height: 13rem;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    background: var(--ui-surface);
    color: var(--ui-text);
    text-decoration: none;
  }

  .flow-card--clickable {
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .flow-card--clickable:hover {
    border-color: var(--ui-accent);
    background: var(--ui-surface-raised);
  }

  .flow-card--clickable:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 3px;
  }

  .flow-card--disabled {
    opacity: 0.68;
  }

  .flow-card__header,
  .flow-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .flow-card__icon {
    display: grid;
    width: 2.5rem;
    height: 2.5rem;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    background: var(--ui-surface-raised);
    font-size: 1.25rem;
  }

  .flow-card__body {
    min-width: 0;
    flex: 1 1 auto;
  }

  .flow-card__body h2 {
    margin: 0;
    font-size: 1.125rem;
  }

  .flow-card__body p {
    margin: 0.5rem 0 0;
    color: var(--ui-text-muted);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .flow-card__footer {
    min-height: 2rem;
    padding-top: 0.875rem;
    border-top: 1px solid var(--ui-border);
  }

  .flow-card__count {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
  }

  .flow-card__count strong {
    font-size: 1.125rem;
  }

  .flow-card__count span,
  .flow-card__action {
    color: var(--ui-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .flow-card__action {
    color: var(--ui-accent);
  }
</style>
