import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import AsyncState from './AsyncState.svelte';
import Badge from './Badge.svelte';
import Button from './Button.svelte';
import Field from './Field.svelte';
import IconButton from './IconButton.svelte';
import ModalShell from './ModalShell.svelte';

const textSnippet = (text: string) => createRawSnippet(() => ({ render: () => text }));

describe('UI primitives', () => {
  it('Button exposes loading and disabled state', () => {
    render(Button, { props: { children: textSnippet('Save'), loading: true } });
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('IconButton uses its label as the accessible name', async () => {
    const onclick = vi.fn();
    render(IconButton, { props: { label: 'Delete', children: textSnippet('×'), onclick } });
    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('Field renders labeled single and multiline controls', () => {
    const { unmount } = render(Field, { props: { label: 'Title', value: 'Draft' } });
    expect(screen.getByLabelText('Title')).toHaveValue('Draft');
    unmount();
    render(Field, { props: { label: 'Body', multiline: true, value: 'Text' } });
    expect(screen.getByLabelText('Body').tagName).toBe('TEXTAREA');
  });

  it('Badge exposes the selected semantic tone', () => {
    render(Badge, { props: { tone: 'success', children: textSnippet('Ready') } });
    expect(screen.getByText('Ready')).toHaveClass('ui-badge--success');
  });

  it('AsyncState uses alert semantics for failures', () => {
    render(AsyncState, { props: { state: 'error', title: 'Request failed' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Request failed');
  });

  it('ModalShell exposes dialog semantics and closes from its command', async () => {
    const onclose = vi.fn();
    render(ModalShell, {
      props: { title: 'Details', children: textSnippet('Content'), onclose },
    });
    expect(screen.getByRole('dialog', { name: 'Details' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onclose).toHaveBeenCalledOnce();
  });
});
