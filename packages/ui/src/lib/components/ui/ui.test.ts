import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import AsyncState from './AsyncState.svelte';
import Badge from './Badge.svelte';
import Button from './Button.svelte';
import Field from './Field.svelte';
import IconButton from './IconButton.svelte';
import ModalShell from './ModalShell.svelte';
import Panel from './Panel.svelte';

const textSnippet = (text: string) => createRawSnippet(() => ({ render: () => text }));

describe('UI primitives', () => {
  it('Button exposes loading and disabled state', () => {
    render(Button, { props: { children: textSnippet('Save'), loading: true } });
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('Button renders navigation as a styled link', () => {
    render(Button, { props: { children: textSnippet('Connect'), href: '/connect' } });
    expect(screen.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '/connect');
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

  it('Field supports an accessible search control', () => {
    render(Field, {
      props: { label: 'Search library', labelHidden: true, type: 'search', value: '' },
    });
    expect(screen.getByRole('searchbox', { name: 'Search library' })).toBeInTheDocument();
  });

  it('Badge exposes the selected semantic tone', () => {
    render(Badge, { props: { tone: 'success', children: textSnippet('Ready') } });
    expect(screen.getByText('Ready')).toHaveClass('ui-badge--success');
  });

  it('AsyncState uses alert semantics for failures', () => {
    render(AsyncState, { props: { state: 'error', title: 'Request failed' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Request failed');
  });

  it('AsyncState offers a compact layout for constrained surfaces', () => {
    render(AsyncState, {
      props: { state: 'empty', title: 'No card data', compact: true },
    });
    expect(screen.getByRole('status')).toHaveClass('ui-async-state--compact');
  });

  it('Panel exposes its semantic element, label, and surface variant', () => {
    render(Panel, {
      props: {
        element: 'section',
        ariaLabel: 'Market summary',
        raised: true,
        padding: 'sm',
        children: textSnippet('Summary content'),
      },
    });

    expect(screen.getByRole('region', { name: 'Market summary' })).toHaveClass(
      'ui-panel--raised',
      'ui-panel--sm'
    );
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

  it('ModalShell closes on Escape and backdrop clicks', async () => {
    const onclose = vi.fn();
    render(ModalShell, {
      props: { title: 'Details', children: textSnippet('Content'), onclose },
    });

    await fireEvent.keyDown(window, { key: 'Escape' });
    await fireEvent.click(screen.getByRole('presentation'));

    expect(onclose).toHaveBeenCalledTimes(2);
  });

  it('ModalShell moves focus inside and restores it when unmounted', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();

    const view = render(ModalShell, {
      props: { title: 'Details', children: textSnippet('Content'), onclose: vi.fn() },
    });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus());
    view.unmount();
    expect(trigger).toHaveFocus();

    trigger.remove();
  });

  it('ModalShell keeps keyboard focus inside the dialog', async () => {
    render(ModalShell, {
      props: {
        title: 'Details',
        actions: textSnippet('<button>Header action</button>'),
        children: textSnippet('<button>Body action</button>'),
        onclose: vi.fn(),
      },
    });

    const headerAction = screen.getByRole('button', { name: 'Header action' });
    const bodyAction = screen.getByRole('button', { name: 'Body action' });
    await waitFor(() => expect(headerAction).toHaveFocus());

    await fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(bodyAction).toHaveFocus();

    await fireEvent.keyDown(window, { key: 'Tab' });
    expect(headerAction).toHaveFocus();
  });
});
