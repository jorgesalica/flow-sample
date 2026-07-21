<script lang="ts">
  import { untrack } from 'svelte';
  import type { BoardsSnapshot } from '@flows/shared';
  import { AsyncState, Button, FlowLayout } from '@lib/components';
  import {
    createNamedBoard,
    deleteBoard,
    renameBoard,
    saveBoardLayout,
    selectBoard,
  } from '@lib/boards/api';
  import { getFlows } from '@lib/flows';
  import { invalidateData } from '@lib/invalidate';
  import { INVALIDATION } from '@lib/invalidation';
  import { showError } from '@lib/toast';
  import { createDefaultBoardLayout, layoutToBoardItems, type BoardLayout } from './board-layout';
  import BoardToolbar from './components/BoardToolbar.svelte';
  import FlowBoard from './components/FlowBoard.svelte';

  let { data }: { data: { snapshot: BoardsSnapshot | null } } = $props();
  const pageTitle = 'Cosmic Flow - Data Exploration Hub';
  const flows = getFlows();
  const flowIds = flows.map((flow) => flow.id);
  let snapshot = $state<BoardsSnapshot | null>(untrack(() => data.snapshot));
  let isMutating = $state(false);

  $effect(() => {
    if (data.snapshot) snapshot = data.snapshot;
  });

  async function mutate(action: () => Promise<BoardsSnapshot>): Promise<void> {
    isMutating = true;
    try {
      snapshot = await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Board update failed';
      showError(message);
      throw error;
    } finally {
      isMutating = false;
    }
  }

  async function handleCreate(name: string): Promise<void> {
    await mutate(() =>
      createNamedBoard(name, layoutToBoardItems(createDefaultBoardLayout(flowIds)))
    );
  }

  async function handleRename(name: string): Promise<void> {
    if (!snapshot) return;
    const activeBoardId = snapshot.activeBoard.id;
    await mutate(() => renameBoard(activeBoardId, name));
  }

  async function handleSelect(id: string): Promise<void> {
    await mutate(() => selectBoard(id));
  }

  async function handleDelete(): Promise<void> {
    if (!snapshot) return;
    const activeBoardId = snapshot.activeBoard.id;
    await mutate(() => deleteBoard(activeBoardId));
  }

  async function handleLayoutChange(layout: BoardLayout): Promise<void> {
    if (!snapshot) throw new Error('Board is unavailable');
    snapshot = await saveBoardLayout(snapshot.activeBoard.id, layoutToBoardItems(layout));
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<FlowLayout>
  <section class="flow-index" aria-labelledby="flow-index-title">
    <header class="flow-index__header">
      <h1 id="flow-index-title">Board</h1>
      {#if snapshot}
        <BoardToolbar
          {snapshot}
          busy={isMutating}
          oncreate={handleCreate}
          onrename={handleRename}
          onselect={handleSelect}
          ondelete={handleDelete}
        />
      {/if}
    </header>

    <div class="flow-index__content">
      {#if snapshot}
        {#key snapshot.activeBoard.id}
          <FlowBoard {flows} board={snapshot.activeBoard} onlayoutchange={handleLayoutChange} />
        {/key}
      {:else}
        {#snippet retryBoards()}
          <Button variant="secondary" onclick={() => void invalidateData(INVALIDATION.BOARDS)}>
            Retry
          </Button>
        {/snippet}
        <AsyncState
          state="error"
          title="Board unavailable"
          message="The saved board could not be loaded."
          action={retryBoards}
        />
      {/if}
    </div>
  </section>
</FlowLayout>

<style>
  .flow-index {
    display: flex;
    min-height: calc(100dvh - var(--app-nav-height) - 3.5rem);
    flex-direction: column;
    gap: 1.5rem;
  }

  .flow-index__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--ui-border);
  }

  .flow-index__header h1 {
    margin: 0;
    font-size: 2rem;
  }

  .flow-index__content {
    display: flex;
    min-height: 24rem;
    flex: 1 1 auto;
  }

  @media (max-width: 40rem) {
    .flow-index {
      gap: 1rem;
    }

    .flow-index__header h1 {
      font-size: 1.75rem;
    }

    .flow-index__header {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
