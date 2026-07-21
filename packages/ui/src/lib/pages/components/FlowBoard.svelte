<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Board } from '@flows/shared';
  import { AsyncState, Badge, Button, IconButton } from '@lib/components';
  import {
    BoardCardState,
    createBoardCardError,
    createStaleBoardCard,
    hasBoardCardData,
    type BoardCardSnapshot,
    type BoardCardViewState,
    type FlowDefinition,
  } from '@lib/flows';
  import {
    boardMatchesLayout,
    boardToLayout,
    completeBoardLayoutMigration,
    createDefaultBoardLayout,
    isDefaultBoardLayout,
    readBoardLayoutMigration,
    reconcileBoardLayout,
    reorderBoardItem,
    updateBoardItem,
    type BoardItemSize,
    type BoardLayout,
  } from '../board-layout';
  import BoardItem from './BoardItem.svelte';

  interface Props {
    flows: FlowDefinition[];
    board: Board;
    onlayoutchange: (layout: BoardLayout) => Promise<void>;
  }

  interface OrderedBoardItem {
    flow: FlowDefinition;
    layout: BoardLayout['items'][number];
  }

  let { flows, board, onlayoutchange }: Props = $props();
  const flowIds = $derived(flows.map((flow) => flow.id));
  let layout = $state<BoardLayout>(
    untrack(() =>
      boardToLayout(
        board,
        flows.map((flow) => flow.id)
      )
    )
  );
  let isSavingLayout = $state(false);
  let cardStates = $state<Record<string, BoardCardViewState>>({});
  let isRefreshing = $state(false);
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
  const isDefaultLayout = $derived(isDefaultBoardLayout(layout, flowIds));
  const loadingCount = $derived(
    flows.filter((flow) => cardStates[flow.id]?.state === BoardCardState.LOADING).length
  );
  const readyFlowCount = $derived(flows.filter((flow) => cardStates[flow.id]?.canOpen).length);

  onMount(() => {
    void initializeLayout();
    void refreshSummaries(false);
  });

  async function initializeLayout(): Promise<void> {
    const migration = readBoardLayoutMigration(window.localStorage, flowIds);
    if (migration.found) {
      if (migration.layout) {
        layout = migration.layout;
        isSavingLayout = true;
        try {
          await onlayoutchange(layout);
          completeBoardLayoutMigration(window.localStorage);
          announcement = 'Local board layout migrated.';
        } catch {
          announcement = 'Local layout is active, but migration could not be saved.';
        } finally {
          isSavingLayout = false;
        }
        return;
      }
      completeBoardLayoutMigration(window.localStorage);
    }

    if (!boardMatchesLayout(board, layout)) {
      isSavingLayout = true;
      try {
        await onlayoutchange(layout);
      } catch {
        announcement = 'Board layout could not be synchronized.';
      } finally {
        isSavingLayout = false;
      }
    }
  }

  function cardFor(flowId: string): BoardCardViewState {
    return cardStates[flowId] ?? { state: BoardCardState.LOADING, canOpen: false };
  }

  async function loadCard(
    flow: FlowDefinition,
    previous: BoardCardViewState | undefined
  ): Promise<void> {
    let next: BoardCardSnapshot;
    try {
      next = await flow.boardCard.load();
    } catch {
      next = createBoardCardError();
    }

    if (next.state === BoardCardState.ERROR && previous && hasBoardCardData(previous)) {
      next = createStaleBoardCard(previous, 'Refresh failed. Showing the previous summary.');
    }

    cardStates = { ...cardStates, [flow.id]: next };
  }

  async function refreshSummaries(announce = true): Promise<void> {
    if (isRefreshing) return;
    isRefreshing = true;
    const previousStates = cardStates;
    cardStates = Object.fromEntries(
      flows.map((flow) => [flow.id, { state: BoardCardState.LOADING, canOpen: false }])
    );

    await Promise.all(flows.map((flow) => loadCard(flow, previousStates[flow.id])));
    isRefreshing = false;

    if (announce) {
      const degradedCount = Object.values(cardStates).filter(
        (card) => card.state === BoardCardState.ERROR || card.state === BoardCardState.STALE
      ).length;
      announcement =
        degradedCount > 0
          ? `Flow summaries refreshed with ${degradedCount} degraded.`
          : 'Flow summaries refreshed.';
    }
  }

  function flowName(itemId: string): string {
    return flows.find((flow) => flow.id === itemId)?.name ?? itemId;
  }

  async function applyLayout(nextLayout: BoardLayout, message: string): Promise<void> {
    if (isSavingLayout) return;
    const previous = layout;
    layout = reconcileBoardLayout(nextLayout, flowIds);
    isSavingLayout = true;
    try {
      await onlayoutchange(layout);
      announcement = message;
    } catch {
      layout = previous;
      announcement = 'Board changes could not be saved.';
    } finally {
      isSavingLayout = false;
    }
  }

  function moveItem(itemId: string, targetIndex: number): void {
    const nextLayout = reorderBoardItem(layout, itemId, targetIndex);
    if (nextLayout === layout) return;
    void applyLayout(nextLayout, `${flowName(itemId)} moved to position ${targetIndex + 1}.`);
  }

  function toggleItem(itemId: string): void {
    const item = layout.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    void applyLayout(
      updateBoardItem(layout, itemId, { collapsed: !item.collapsed }),
      `${flowName(itemId)} ${item.collapsed ? 'expanded' : 'collapsed'}.`
    );
  }

  function resizeItem(itemId: string, size: BoardItemSize): void {
    void applyLayout(
      updateBoardItem(layout, itemId, { size }),
      `${flowName(itemId)} size changed to ${size}.`
    );
  }

  function resetLayout(): void {
    void applyLayout(createDefaultBoardLayout(flowIds), 'Board layout reset.');
  }

  function startDragging(event: DragEvent, itemId: string): void {
    if (isSavingLayout) {
      event.preventDefault();
      return;
    }
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
      {#if loadingCount > 0}<Badge tone="info">{loadingCount} loading</Badge>{/if}
      {#if isSavingLayout}<Badge tone="info">Saving</Badge>{/if}
      <Badge tone="success">{readyFlowCount} ready</Badge>
      <Badge tone="neutral">{flows.length} total</Badge>
    </div>
    <div class="flow-board__actions">
      <IconButton
        label="Refresh summaries"
        size="sm"
        disabled={isRefreshing}
        aria-busy={isRefreshing}
        onclick={() => void refreshSummaries()}
      >
        <span aria-hidden="true">&#8635;</span>
      </IconButton>
      <Button
        variant="secondary"
        size="sm"
        disabled={isDefaultLayout || isSavingLayout}
        onclick={resetLayout}
      >
        <span aria-hidden="true">&#8634;</span>
        Reset layout
      </Button>
    </div>
  </div>

  {#if orderedItems.length === 0}
    <AsyncState state="empty" title="No flows registered" />
  {:else}
    <div class="flow-board__grid" aria-label="Flow board">
      {#each orderedItems as item, index (item.flow.id)}
        <BoardItem
          flow={item.flow}
          card={cardFor(item.flow.id)}
          layout={item.layout}
          position={index}
          itemCount={orderedItems.length}
          isDragging={draggingId === item.flow.id}
          isDropTarget={dropTargetId === item.flow.id}
          disabled={isSavingLayout}
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
  .flow-board__summary,
  .flow-board__actions {
    display: flex;
    align-items: center;
  }

  .flow-board__toolbar {
    min-height: 2.5rem;
    justify-content: space-between;
    gap: 1rem;
  }

  .flow-board__summary,
  .flow-board__actions {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .flow-board__actions {
    justify-content: flex-end;
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

    .flow-board__actions {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
