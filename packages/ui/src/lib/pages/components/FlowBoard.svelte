<script lang="ts">
  import { onMount } from 'svelte';
  import { AsyncState, Badge, Button } from '@lib/components';
  import {
    createDefaultBoardLayout,
    isDefaultBoardLayout,
    loadBoardLayout,
    persistBoardLayout,
    reconcileBoardLayout,
    reorderBoardItem,
    updateBoardItem,
    type BoardItemSize,
    type BoardLayout,
  } from '../board-layout';
  import type { FlowCardModel } from '../types';
  import BoardItem from './BoardItem.svelte';

  interface Props {
    flows: FlowCardModel[];
    readyFlowCount: number;
  }

  interface OrderedBoardItem {
    flow: FlowCardModel;
    layout: BoardLayout['items'][number];
  }

  let { flows, readyFlowCount }: Props = $props();
  const flowIds = $derived(flows.map((flow) => flow.id));
  let layout = $state<BoardLayout>(createDefaultBoardLayout([]));
  let isLayoutReady = $state(false);
  let draggingId = $state<string | null>(null);
  let dropTargetId = $state<string | null>(null);
  let announcement = $state('');

  const orderedItems = $derived.by(() => {
    const flowById = new Map(flows.map((flow) => [flow.id, flow]));
    return layout.items.flatMap<OrderedBoardItem>((item) => {
      const flow = flowById.get(item.id);
      return flow ? [{ flow, layout: item }] : [];
    });
  });
  const isDefaultLayout = $derived(!isLayoutReady || isDefaultBoardLayout(layout, flowIds));

  onMount(() => {
    layout = loadBoardLayout(window.localStorage, flowIds);
    isLayoutReady = true;
  });

  function flowName(itemId: string): string {
    return flows.find((flow) => flow.id === itemId)?.name ?? itemId;
  }

  function applyLayout(nextLayout: BoardLayout, message: string): void {
    layout = reconcileBoardLayout(nextLayout, flowIds);
    const persisted = persistBoardLayout(window.localStorage, layout);
    announcement = persisted ? message : `${message} Changes could not be saved.`;
  }

  function moveItem(itemId: string, targetIndex: number): void {
    const nextLayout = reorderBoardItem(layout, itemId, targetIndex);
    if (nextLayout === layout) return;
    applyLayout(nextLayout, `${flowName(itemId)} moved to position ${targetIndex + 1}.`);
  }

  function toggleItem(itemId: string): void {
    const item = layout.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    applyLayout(
      updateBoardItem(layout, itemId, { collapsed: !item.collapsed }),
      `${flowName(itemId)} ${item.collapsed ? 'expanded' : 'collapsed'}.`
    );
  }

  function resizeItem(itemId: string, size: BoardItemSize): void {
    applyLayout(
      updateBoardItem(layout, itemId, { size }),
      `${flowName(itemId)} size changed to ${size}.`
    );
  }

  function resetLayout(): void {
    applyLayout(createDefaultBoardLayout(flowIds), 'Board layout reset.');
  }

  function startDragging(event: DragEvent, itemId: string): void {
    draggingId = itemId;
    dropTargetId = null;
    event.dataTransfer?.setData('text/plain', itemId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  function finishDragging(): void {
    draggingId = null;
    dropTargetId = null;
  }

  function dragOver(event: DragEvent, targetId: string): void {
    if (!draggingId || draggingId === targetId) return;
    event.preventDefault();
    dropTargetId = targetId;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  function dropItem(event: DragEvent, targetId: string, targetIndex: number): void {
    event.preventDefault();
    const itemId = draggingId ?? event.dataTransfer?.getData('text/plain') ?? '';
    if (itemId && itemId !== targetId) moveItem(itemId, targetIndex);
    finishDragging();
  }
</script>

<div class="flow-board">
  <div class="flow-board__toolbar">
    <div class="flow-board__summary" aria-label="Flow availability">
      <Badge tone="success">{readyFlowCount} ready</Badge>
      <Badge tone="neutral">{flows.length} total</Badge>
    </div>
    <Button variant="secondary" size="sm" disabled={isDefaultLayout} onclick={resetLayout}>
      <span aria-hidden="true">&#8634;</span>
      Reset layout
    </Button>
  </div>

  {#if !isLayoutReady}
    <AsyncState state="loading" title="Loading board layout" />
  {:else if orderedItems.length === 0}
    <AsyncState state="empty" title="No flows registered" />
  {:else}
    <div class="flow-board__grid" aria-label="Flow board">
      {#each orderedItems as item, index (item.flow.id)}
        <BoardItem
          flow={item.flow}
          layout={item.layout}
          position={index}
          itemCount={orderedItems.length}
          isDragging={draggingId === item.flow.id}
          isDropTarget={dropTargetId === item.flow.id}
          onMoveTo={(targetIndex) => moveItem(item.flow.id, targetIndex)}
          onToggleCollapsed={() => toggleItem(item.flow.id)}
          onSizeChange={(size) => resizeItem(item.flow.id, size)}
          onDragStart={(event) => startDragging(event, item.flow.id)}
          onDragEnd={finishDragging}
          onDragEnter={() => {
            if (draggingId && draggingId !== item.flow.id) dropTargetId = item.flow.id;
          }}
          onDragOver={(event) => dragOver(event, item.flow.id)}
          onDrop={(event) => dropItem(event, item.flow.id, index)}
        />
      {/each}
    </div>
  {/if}

  <p class="flow-board__announcement" aria-live="polite" aria-atomic="true">
    {announcement}
  </p>
</div>

<style>
  .flow-board {
    display: flex;
    min-height: 24rem;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 1rem;
  }

  .flow-board__toolbar,
  .flow-board__summary {
    display: flex;
    align-items: center;
  }

  .flow-board__toolbar {
    min-height: 2.5rem;
    justify-content: space-between;
    gap: 1rem;
  }

  .flow-board__summary {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .flow-board__grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 1rem;
  }

  .flow-board__announcement {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 40rem) {
    .flow-board__toolbar {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
