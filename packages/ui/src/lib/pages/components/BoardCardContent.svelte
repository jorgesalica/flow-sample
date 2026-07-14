<script lang="ts">
  import { AsyncState, Badge } from '@lib/components';
  import { BoardCardState, BoardCardTone, type BoardCardViewState } from '@lib/flows';

  interface Props {
    card: BoardCardViewState;
    description: string;
    showExpanded: boolean;
  }

  let { card, description, showExpanded }: Props = $props();
</script>

<div class="board-card-content" data-summary-state={card.state}>
  {#if card.state === BoardCardState.LOADING}
    <AsyncState state="loading" title="Loading summary" compact />
  {:else if card.state === BoardCardState.EMPTY}
    <div class="board-card-content__state">
      <Badge tone={card.status.tone}>{card.status.label}</Badge>
      <AsyncState state="empty" title={card.title} message={card.message} compact />
    </div>
  {:else if card.state === BoardCardState.ERROR}
    <div class="board-card-content__state">
      <Badge tone={card.status.tone}>{card.status.label}</Badge>
      <AsyncState state="error" title={card.title} message={card.message} compact />
    </div>
  {:else}
    <div class="board-card-content__summary">
      <div class="board-card-content__badges">
        <Badge tone={card.summary.status.tone}>{card.summary.status.label}</Badge>
        {#if card.state === BoardCardState.STALE}
          <Badge tone={BoardCardTone.WARNING}>Stale</Badge>
        {/if}
      </div>
      <div class="board-card-content__primary">
        <strong>{card.summary.primary.value}</strong>
        <span>{card.summary.primary.label}</span>
        {#if card.summary.primary.detail}
          <small>{card.summary.primary.detail}</small>
        {/if}
      </div>
    </div>

    {#if card.state === BoardCardState.STALE}
      <p class="board-card-content__stale" role="status">{card.message}</p>
    {/if}

    {#if showExpanded}
      <div class="board-card-content__expanded">
        <p>{description}</p>

        {#if card.expanded}
          <section class="board-card-content__details" aria-label={card.expanded.heading}>
            <h3>{card.expanded.heading}</h3>
            <dl>
              {#each card.expanded.metrics as metric (metric.label)}
                <div>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                  {#if metric.detail}<small>{metric.detail}</small>{/if}
                </div>
              {/each}
            </dl>
            {#if card.expanded.note}<p class="board-card-content__note">
                {card.expanded.note}
              </p>{/if}
          </section>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .board-card-content {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.875rem;
  }

  .board-card-content__state {
    display: grid;
    justify-items: start;
    gap: 0.25rem;
  }

  .board-card-content__summary {
    display: flex;
    min-width: 0;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
  }

  .board-card-content__badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .board-card-content__primary {
    display: grid;
    min-width: 0;
    grid-template-columns: auto auto;
    align-items: baseline;
    justify-content: end;
    gap: 0.25rem 0.375rem;
    text-align: right;
  }

  .board-card-content__primary strong {
    color: var(--ui-text);
    font-size: 1.375rem;
    line-height: 1;
  }

  .board-card-content__primary span,
  .board-card-content__primary small {
    color: var(--ui-text-muted);
    font-size: 0.75rem;
  }

  .board-card-content__primary small {
    grid-column: 1 / -1;
  }

  .board-card-content__stale {
    margin: 0;
    color: var(--ui-warning);
    font-size: 0.75rem;
  }

  .board-card-content__expanded {
    display: grid;
    gap: 0.875rem;
    padding-top: 0.875rem;
    border-top: 1px solid var(--ui-border);
  }

  .board-card-content__expanded > p,
  .board-card-content__note {
    margin: 0;
    color: var(--ui-text-muted);
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  .board-card-content__details {
    display: grid;
    gap: 0.625rem;
  }

  .board-card-content__details h3 {
    margin: 0;
    color: var(--ui-text);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .board-card-content__details dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
    gap: 0.5rem;
    margin: 0;
  }

  .board-card-content__details dl > div {
    display: grid;
    min-width: 0;
    gap: 0.125rem;
    padding: 0.625rem;
    border-left: 2px solid var(--ui-border-strong);
    background: var(--ui-surface-subtle);
  }

  .board-card-content__details dt,
  .board-card-content__details small {
    color: var(--ui-text-muted);
    font-size: 0.6875rem;
  }

  .board-card-content__details dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--ui-text);
    font-size: 0.875rem;
    font-weight: 700;
  }

  @media (max-width: 40rem) {
    .board-card-content__summary {
      align-items: flex-start;
      flex-direction: column;
    }

    .board-card-content__primary {
      justify-content: start;
      text-align: left;
    }
  }
</style>
