import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { Board, BoardsSnapshot } from '@flows/shared';
import { describe, expect, it, vi } from 'vitest';
import BoardToolbar from './BoardToolbar.svelte';

function makeBoard(id: string, name: string, isDefault = false): Board {
  return {
    id,
    name,
    isDefault,
    layoutVersion: 1,
    items: [],
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
  };
}

function makeSnapshot(activeId = 'default'): BoardsSnapshot {
  const boards = [makeBoard('default', 'My Board', true), makeBoard('research', 'Research')];
  const activeBoard = boards.find((board) => board.id === activeId) ?? boards[0];
  return { boards, activeBoard };
}

function makeProps(snapshot = makeSnapshot()) {
  return {
    snapshot,
    busy: false,
    oncreate: vi.fn<(name: string) => Promise<void>>().mockResolvedValue(),
    onrename: vi.fn<(name: string) => Promise<void>>().mockResolvedValue(),
    onselect: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(),
    ondelete: vi.fn<() => Promise<void>>().mockResolvedValue(),
  };
}

describe('BoardToolbar', () => {
  it('lists boards, selects another board, and protects the default board', async () => {
    const props = makeProps();
    render(BoardToolbar, { props });

    expect(screen.getByRole('combobox', { name: 'Active board' })).toHaveValue('default');
    expect(screen.getByRole('option', { name: 'Research' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete board' })).toBeDisabled();

    await fireEvent.change(screen.getByRole('combobox', { name: 'Active board' }), {
      target: { value: 'research' },
    });
    expect(props.onselect).toHaveBeenCalledWith('research');
  });

  it('creates and renames boards through focused dialogs', async () => {
    const props = makeProps();
    render(BoardToolbar, { props });

    await fireEvent.click(screen.getByRole('button', { name: 'New board' }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Board name' }), {
      target: { value: 'Writing' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(props.oncreate).toHaveBeenCalledWith('Writing'));

    await fireEvent.click(screen.getByRole('button', { name: 'Rename board' }));
    expect(screen.getByRole('textbox', { name: 'Board name' })).toHaveValue('My Board');
    await fireEvent.input(screen.getByRole('textbox', { name: 'Board name' }), {
      target: { value: 'Home' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(props.onrename).toHaveBeenCalledWith('Home'));
  });

  it('confirms deletion and reports rejected mutations', async () => {
    const props = makeProps(makeSnapshot('research'));
    props.ondelete.mockRejectedValueOnce(new Error('Delete failed'));
    render(BoardToolbar, { props });

    await fireEvent.click(screen.getByRole('button', { name: 'Delete board' }));
    expect(screen.getByRole('dialog', { name: 'Delete board' })).toHaveTextContent(
      'Delete Research?'
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Delete failed');
    expect(props.ondelete).toHaveBeenCalledOnce();
  });
});
