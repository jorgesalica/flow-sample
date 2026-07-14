<script lang="ts">
  import { IconButton } from '@lib/components';
  import { BoardCardState, type BoardCardViewState, type FlowDefinition } from '@lib/flows';
  import { BoardItemSize, isBoardItemSize, type BoardItemLayout } from '../board-layout';
  import BoardCardContent from './BoardCardContent.svelte';

  interface Props {
    flow: FlowDefinition;
    card: BoardCardViewState;
    layout: BoardItemLayout;
    position: number;
    itemCount: number;
    isDragging: boolean;
    isDropTarget: boolean;
    onMoveTo: (targetIndex: number) => void;
    onToggleCollapsed: () => void;
    onSizeChange: (size: BoardItemSize) => void;
    onDragStart: (event: DragEvent) => void;
    onDragEnd: () => void;
    onDragEnter: () => void;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
  }

  let {
    flow,
    card,
    layout,
    position,
    itemCount,
    isDragging,
    isDropTarget,
    onMoveTo,
    onToggleCollapsed,
    onSizeChange,
    onDragStart,
    onDragEnd,
    onDragEnter,
    onDragOver,
    onDrop,
  }: Props = $props();

  const isClickable = $derived(card.canOpen);
  const titleId = $derived(`board-item-title-${flow.id}`);
  const contentId = $derived(`board-item-content-${flow.id}`);

  function handleSizeChange(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (isBoardItemSize(value)) onSizeChange(value);
  }
</script>

<article
  class="board-item board-item--{layout.size}"
  class:board-item--collapsed={layout.collapsed}
  class:board-item--dragging={isDragging}
  class:board-item--drop-target={isDropTarget}
  aria-labelledby={titleId}
  aria-busy={card.state === BoardCardState.LOADING}
  data-board-id={flow.id}
  data-size={layout.size}
  data-collapsed={layout.collapsed}
  data-state={card.state}
  data-openable={isClickable}
  draggable="true"
  ondragstart={onDragStart}
  ondragend={onDragEnd}
  ondragenter={onDragEnter}
  ondragover={onDragOver}
  ondrop={onDrop}
>
  <header class="board-item__header">
    <div class="board-item__identity">
      <span class="board-item__drag-handle" aria-hidden="true" title="Drag to reorder">
        &#8942;&#8942;
      </span>
      <span class="board-item__icon" aria-hidden="true">{flow.icon}</span>
      <div class="board-item__heading">
        <h2 id={titleId}>
          {#if isClickable}
            <a href={flow.route} aria-label={`Open ${flow.name}`}>{flow.name}</a>
          {:else}
            {flow.name}
          {/if}
        </h2>
        <span class="board-item__position">{position + 1} of {itemCount}</span>
      </div>
    </div>

    <div class="board-item__controls" role="group" aria-label={`Layout controls for ${flow.name}`}>
      <select
        class="board-item__size"
        value={layout.size}
        aria-label={`Size for ${flow.name}`}
        title={`Size for ${flow.name}`}
        onchange={handleSizeChange}
      >
        <option value={BoardItemSize.COMPACT}>Compact</option>
        <option value={BoardItemSize.STANDARD}>Standard</option>
        <option value={BoardItemSize.WIDE}>Wide</option>
      </select>
      <IconButton
        label={`Move ${flow.name} earlier`}
        size="sm"
        disabled={position === 0}
        onclick={() => onMoveTo(position - 1)}
      >
        <span aria-hidden="true">&uarr;</span>
      </IconButton>
      <IconButton
        label={`Move ${flow.name} later`}
        size="sm"
        disabled={position === itemCount - 1}
        onclick={() => onMoveTo(position + 1)}
      >
        <span aria-hidden="true">&darr;</span>
      </IconButton>
      <IconButton
        label={`${layout.collapsed ? 'Expand' : 'Collapse'} ${flow.name}`}
        size="sm"
        aria-expanded={!layout.collapsed}
        aria-controls={contentId}
        onclick={onToggleCollapsed}
      >
        <span aria-hidden="true"
          >{#if layout.collapsed}+{:else}&minus;{/if}</span
        >
      </IconButton>
    </div>
  </header>

  <div id={contentId} class="board-item__body">
    <BoardCardContent {card} description={flow.description} showExpanded={!layout.collapsed} />

    {#if !layout.collapsed && isClickable}
      <footer class="board-item__footer">
        <span>Open flow <span aria-hidden="true">&rarr;</span></span>
      </footer>
    {/if}
  </div>
</article>

<style>
  .board-item {
    display: flex;
    min-width: 0;
    min-height: 13rem;
    grid-column: span 4;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.5rem;
    background: var(--ui-surface);
    color: var(--ui-text);
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      opacity 150ms ease;
  }

  .board-item:hover {
    border-color: var(--ui-border-strong);
    background: var(--ui-surface-subtle);
  }

  .board-item--standard {
    grid-column: span 6;
  }

  .board-item--wide {
    grid-column: span 12;
  }

  .board-item--collapsed {
    min-height: 9rem;
  }

  .board-item--dragging {
    opacity: 0.45;
  }

  .board-item--drop-target {
    border-color: var(--ui-accent);
    outline: 2px solid color-mix(in srgb, var(--ui-accent) 35%, transparent);
    outline-offset: 2px;
  }

  .board-item__header,
  .board-item__identity,
  .board-item__controls,
  .board-item__footer {
    display: flex;
    align-items: center;
  }

  .board-item__header {
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
  }

  .board-item__identity {
    min-width: 0;
    gap: 0.625rem;
  }

  .board-item__drag-handle {
    color: var(--ui-text-muted);
    cursor: grab;
    font-size: 1rem;
    letter-spacing: 0;
  }

  .board-item__drag-handle:active {
    cursor: grabbing;
  }

  .board-item__icon {
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

  .board-item__heading {
    display: grid;
    min-width: 0;
    gap: 0.25rem;
  }

  .board-item__heading h2 {
    margin: 0;
    font-size: 1rem;
  }

  .board-item__heading a {
    color: var(--ui-text);
    text-decoration: none;
  }

  .board-item__heading a:hover {
    color: var(--ui-accent);
  }

  .board-item__heading a:focus-visible,
  .board-item__size:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }

  .board-item__position {
    color: var(--ui-text-muted);
    font-size: 0.6875rem;
  }

  .board-item__controls {
    flex: 0 0 auto;
    gap: 0.25rem;
  }

  .board-item__size {
    height: 2rem;
    padding: 0 1.75rem 0 0.5rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.375rem;
    background: var(--ui-surface-raised);
    color: var(--ui-text);
    font-size: 0.75rem;
  }

  .board-item__body {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.875rem;
  }

  .board-item__footer {
    min-height: 2rem;
    margin-top: auto;
    justify-content: flex-end;
    padding-top: 0.875rem;
    border-top: 1px solid var(--ui-border);
  }

  .board-item__footer span {
    color: var(--ui-accent);
    font-size: 0.75rem;
    font-weight: 600;
  }

  @media (max-width: 56.25rem) {
    .board-item,
    .board-item--standard {
      grid-column: span 6;
    }

    .board-item--wide {
      grid-column: span 12;
    }

    .board-item__header {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (max-width: 40rem) {
    .board-item,
    .board-item--standard,
    .board-item--wide {
      grid-column: span 12;
    }

    .board-item__controls {
      width: 100%;
    }

    .board-item__size {
      min-width: 0;
      flex: 1 1 auto;
    }
  }
</style>
