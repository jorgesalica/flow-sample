import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tick } from 'svelte';
import { render, screen, fireEvent } from '@testing-library/svelte';

// Mock the edge so the store never hits the network.
vi.mock('../api', () => ({
  fetchModelCatalog: vi.fn().mockResolvedValue([]),
  fetchConversations: vi.fn().mockResolvedValue([]),
  fetchMessages: vi.fn().mockResolvedValue([]),
  deleteConversation: vi.fn().mockResolvedValue(undefined),
  sendMessageStream: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@lib/toast', () => ({ showError: vi.fn() }));

import type { StreamEvent } from '../api';
import * as api from '../api';
import { chatStore } from '../stores';
import ChatInput from './ChatInput.svelte';

const sendMessageStream = vi.mocked(api.sendMessageStream);

/**
 * Default stream behaviour: emit a terminal `done` event so the store returns
 * to its idle (isLoading=false) state. Without this the singleton store would
 * stay "loading" and leak a disabled input into the next test.
 */
function idleStream() {
  sendMessageStream.mockImplementation(
    async (_c, _m, _mode, _model, onEvent: (e: StreamEvent) => void) => {
      onEvent({
        type: 'done',
        message: {
          id: 'a1',
          conversationId: 'c1',
          role: 'assistant',
          content: 'ok',
          modelUsed: 'gpt-4o',
          providerUsed: 'openai',
          createdAt: 1,
        },
      });
    }
  );
}

/** Reset the singleton store to a known idle state between tests. */
async function resetStore() {
  vi.mocked(api.fetchModelCatalog).mockResolvedValueOnce([]);
  vi.mocked(api.fetchConversations).mockResolvedValueOnce([]);
  vi.mocked(api.fetchConversations).mockResolvedValue([]);
  await chatStore.init();
  chatStore.startNewConversation();
}

describe('ChatInput', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    idleStream();
    await resetStore();
  });

  it('renders the textarea and a disabled send button while empty', () => {
    render(ChatInput);

    const textarea = screen.getByPlaceholderText('Send a message...');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toBeEnabled();
    expect(screen.getByTitle('Send message')).toBeDisabled();
  });

  it('enables the send button once the user types non-whitespace', async () => {
    render(ChatInput);
    const textarea = screen.getByPlaceholderText('Send a message...');

    await fireEvent.input(textarea, { target: { value: 'hello' } });

    expect(screen.getByTitle('Send message')).toBeEnabled();
  });

  it('keeps the send button disabled for whitespace-only input', async () => {
    render(ChatInput);
    const textarea = screen.getByPlaceholderText('Send a message...');

    await fireEvent.input(textarea, { target: { value: '   ' } });

    expect(screen.getByTitle('Send message')).toBeDisabled();
  });

  it('sends a trimmed message on button click and clears the input', async () => {
    render(ChatInput);
    const textarea = screen.getByPlaceholderText<HTMLTextAreaElement>('Send a message...');

    await fireEvent.input(textarea, { target: { value: '  hi there  ' } });
    await fireEvent.click(screen.getByTitle('Send message'));

    expect(sendMessageStream).toHaveBeenCalledTimes(1);
    expect(sendMessageStream).toHaveBeenCalledWith(
      expect.any(String),
      'hi there',
      expect.any(String),
      expect.anything(),
      expect.any(Function)
    );
    expect(textarea.value).toBe('');
  });

  it('submits on Enter without shift', async () => {
    render(ChatInput);
    const textarea = screen.getByPlaceholderText('Send a message...');

    await fireEvent.input(textarea, { target: { value: 'enter sends' } });
    await tick();
    await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(sendMessageStream).toHaveBeenCalledTimes(1);
  });

  it('does NOT submit on Shift+Enter (newline)', async () => {
    render(ChatInput);
    const textarea = screen.getByPlaceholderText('Send a message...');

    await fireEvent.input(textarea, { target: { value: 'line one' } });
    await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(sendMessageStream).not.toHaveBeenCalled();
  });

  it('does not send empty/whitespace messages', async () => {
    render(ChatInput);
    const textarea = screen.getByPlaceholderText('Send a message...');

    await fireEvent.input(textarea, { target: { value: '   ' } });
    await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(sendMessageStream).not.toHaveBeenCalled();
  });

  it('disables the textarea and button while a send is in flight (isLoading)', async () => {
    // Hold the stream open so isLoading stays true.
    let resolveStream: () => void = () => {};
    sendMessageStream.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveStream = resolve;
        })
    );

    render(ChatInput);
    const textarea = screen.getByPlaceholderText('Send a message...');
    await fireEvent.input(textarea, { target: { value: 'busy' } });
    await fireEvent.click(screen.getByTitle('Send message'));

    expect(screen.getByPlaceholderText('Send a message...')).toBeDisabled();
    expect(screen.getByTitle('Send message')).toBeDisabled();

    resolveStream();
  });

  it('renders the AI disclaimer footer', () => {
    render(ChatInput);
    expect(screen.getByText(/AI can make mistakes/i)).toBeInTheDocument();
  });
});
