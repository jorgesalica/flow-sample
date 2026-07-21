<script lang="ts">
  import type { BoardsSnapshot } from '@flows/shared';
  import { Button, Field, IconButton, ModalShell } from '@lib/components';

  interface Props {
    snapshot: BoardsSnapshot;
    busy: boolean;
    oncreate: (name: string) => Promise<void>;
    onrename: (name: string) => Promise<void>;
    onselect: (id: string) => Promise<void>;
    ondelete: () => Promise<void>;
  }

  let { snapshot, busy, oncreate, onrename, onselect, ondelete }: Props = $props();
  let dialog = $state<'create' | 'rename' | 'delete' | null>(null);
  let boardName = $state('');
  let pending = $state(false);
  let errorMessage = $state('');
  let selectionError = $state('');

  const isBusy = $derived(busy || pending);

  function openCreate(): void {
    boardName = '';
    errorMessage = '';
    dialog = 'create';
  }

  function openRename(): void {
    boardName = snapshot.activeBoard.name;
    errorMessage = '';
    dialog = 'rename';
  }

  function closeDialog(): void {
    if (!pending) dialog = null;
  }

  async function submitName(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const name = boardName.trim();
    if (!name) {
      errorMessage = 'Board name is required.';
      return;
    }

    pending = true;
    errorMessage = '';
    try {
      if (dialog === 'create') await oncreate(name);
      else await onrename(name);
      dialog = null;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Board update failed.';
    } finally {
      pending = false;
    }
  }

  async function handleSelection(event: Event): Promise<void> {
    const id = (event.currentTarget as HTMLSelectElement).value;
    if (id === snapshot.activeBoard.id) return;
    selectionError = '';
    try {
      await onselect(id);
    } catch {
      selectionError = 'Board selection failed.';
    }
  }

  async function confirmDelete(): Promise<void> {
    pending = true;
    errorMessage = '';
    try {
      await ondelete();
      dialog = null;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Board deletion failed.';
    } finally {
      pending = false;
    }
  }
</script>

<div class="board-toolbar" aria-label="Board management">
  <label class="board-toolbar__selector">
    <span>Board</span>
    <select
      value={snapshot.activeBoard.id}
      disabled={isBusy}
      aria-label="Active board"
      onchange={(event) => void handleSelection(event)}
    >
      {#each snapshot.boards as board (board.id)}
        <option value={board.id}>{board.name}</option>
      {/each}
    </select>
  </label>

  <div class="board-toolbar__actions">
    <Button variant="secondary" size="sm" disabled={isBusy} onclick={openCreate}>
      <span aria-hidden="true">+</span>
      New board
    </Button>
    <IconButton label="Rename board" size="sm" disabled={isBusy} onclick={openRename}>
      <span aria-hidden="true">&#9998;</span>
    </IconButton>
    <IconButton
      label="Delete board"
      variant="danger"
      size="sm"
      disabled={isBusy || snapshot.activeBoard.isDefault}
      onclick={() => {
        errorMessage = '';
        dialog = 'delete';
      }}
    >
      <span aria-hidden="true">&#128465;</span>
    </IconButton>
  </div>
</div>

{#if selectionError}<p class="board-toolbar__error" role="alert">{selectionError}</p>{/if}

{#if dialog === 'create' || dialog === 'rename'}
  <ModalShell
    title={dialog === 'create' ? 'New board' : 'Rename board'}
    onclose={closeDialog}
    size="sm"
  >
    <form class="board-toolbar__form" onsubmit={(event) => void submitName(event)}>
      <Field label="Board name" bind:value={boardName} required disabled={pending} />
      {#if errorMessage}<p class="board-toolbar__error" role="alert">{errorMessage}</p>{/if}
      <div class="board-toolbar__form-actions">
        <Button variant="ghost" disabled={pending} onclick={closeDialog}>Cancel</Button>
        <Button type="submit" loading={pending}>{dialog === 'create' ? 'Create' : 'Save'}</Button>
      </div>
    </form>
  </ModalShell>
{:else if dialog === 'delete'}
  <ModalShell title="Delete board" onclose={closeDialog} size="sm">
    <div class="board-toolbar__form">
      <p>Delete <strong>{snapshot.activeBoard.name}</strong>?</p>
      {#if errorMessage}<p class="board-toolbar__error" role="alert">{errorMessage}</p>{/if}
      <div class="board-toolbar__form-actions">
        <Button variant="ghost" disabled={pending} onclick={closeDialog}>Cancel</Button>
        <Button variant="danger" loading={pending} onclick={() => void confirmDelete()}
          >Delete</Button
        >
      </div>
    </div>
  </ModalShell>
{/if}

<style>
  .board-toolbar,
  .board-toolbar__selector,
  .board-toolbar__actions,
  .board-toolbar__form-actions {
    display: flex;
    align-items: center;
  }

  .board-toolbar {
    min-width: 0;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .board-toolbar__selector {
    gap: 0.5rem;
    color: var(--ui-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .board-toolbar__selector select {
    width: min(14rem, 38vw);
    height: 2rem;
    padding: 0 1.75rem 0 0.5rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.375rem;
    background: var(--ui-surface-raised);
    color: var(--ui-text);
  }

  .board-toolbar__selector select:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }

  .board-toolbar__actions {
    gap: 0.25rem;
  }

  .board-toolbar__form {
    display: grid;
    gap: 1rem;
  }

  .board-toolbar__form p {
    margin: 0;
    color: var(--ui-text-muted);
  }

  .board-toolbar__form-actions {
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .board-toolbar__error {
    margin: 0;
    color: var(--ui-danger);
    font-size: 0.75rem;
  }

  @media (max-width: 40rem) {
    .board-toolbar {
      width: 100%;
      align-items: stretch;
      flex-direction: column;
    }

    .board-toolbar__selector,
    .board-toolbar__selector select {
      width: 100%;
    }

    .board-toolbar__actions {
      justify-content: flex-end;
    }
  }
</style>
