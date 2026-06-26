import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { ChatMessage, ChatProviderGroup } from '@flows/shared';
import type { StreamEvent } from '../api';

vi.mock('../api', () => ({
  fetchModelCatalog: vi.fn().mockResolvedValue([]),
  fetchConversations: vi.fn().mockResolvedValue([]),
  fetchMessages: vi.fn().mockResolvedValue([]),
  deleteConversation: vi.fn().mockResolvedValue(undefined),
  sendMessageStream: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@lib/toast', () => ({ showError: vi.fn() }));

import * as api from '../api';
import { chatStore } from '../stores.svelte';
import MessageList from './MessageList.svelte';

const fetchMessages = vi.mocked(api.fetchMessages);
const sendMessageStream = vi.mocked(api.sendMessageStream);

function makeCatalog(): ChatProviderGroup[] {
  return [
    {
      provider: 'openai',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', tier: 'very_high', pricing: 'paid', contextWindow: 1 },
      ],
    },
  ];
}

function userMsg(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'u1',
    conversationId: 'c1',
    role: 'user',
    content: 'What is the capital of France?',
    modelUsed: '',
    createdAt: 1,
    ...over,
  };
}

function assistantMsg(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'a1',
    conversationId: 'c1',
    role: 'assistant',
    content: 'The capital is Paris.',
    modelUsed: 'gpt-4o',
    providerUsed: 'openai',
    createdAt: 2,
    ...over,
  };
}

/** Seed the store to a clean state with the given catalog + messages. */
async function seed(messages: ChatMessage[], catalog: ChatProviderGroup[] = []) {
  chatStore.hydrate({ catalog, conversations: [], selectedModel: '' });
  chatStore.isStreaming = false;
  chatStore.streamingContent = '';
  fetchMessages.mockResolvedValueOnce(messages);
  await chatStore.loadConversation('c1');
}

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMessageStream.mockResolvedValue(undefined);
  });

  it('shows the empty placeholder when there are no messages and no stream', async () => {
    await seed([]);
    render(MessageList);

    expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
    expect(screen.getByText(/Select a model from the top menu/i)).toBeInTheDocument();
  });

  it('renders a user message as plain text', async () => {
    await seed([userMsg()]);
    render(MessageList);

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    // Negative space: empty-state placeholder gone.
    expect(screen.queryByText('How can I help you today?')).not.toBeInTheDocument();
  });

  it('renders an assistant message as markdown-rendered HTML', async () => {
    await seed([assistantMsg({ content: 'Answer with **bold** word' })]);
    render(MessageList);

    const strong = document.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong).toHaveTextContent('bold');
  });

  it('shows a human-readable model badge from the catalog for assistant messages', async () => {
    await seed([assistantMsg()], makeCatalog());
    render(MessageList);

    expect(screen.getByText('openai / GPT-4o')).toBeInTheDocument();
  });

  it('falls back to a cleaned model id when not in the catalog', async () => {
    await seed([assistantMsg({ modelUsed: 'mixtral-8x7b', providerUsed: 'groq' })], makeCatalog());
    render(MessageList);

    expect(screen.getByText('groq / Mixtral 8x7b')).toBeInTheDocument();
  });

  it('does NOT render a model badge for user messages', async () => {
    await seed([userMsg()], makeCatalog());
    render(MessageList);

    expect(screen.queryByText(/openai \//)).not.toBeInTheDocument();
  });

  it('renders multiple messages in order', async () => {
    await seed([userMsg(), assistantMsg()]);
    render(MessageList);

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('The capital is Paris.')).toBeInTheDocument();
  });

  it('shows a typing indicator while streaming with no content yet', async () => {
    await seed([]);
    // Hold the stream open with no delta to keep isStreaming=true / empty content.
    let release: () => void = () => {};
    sendMessageStream.mockImplementationOnce(
      () => new Promise<void>((resolve) => (release = resolve))
    );
    chatStore.startNewConversation();
    void chatStore.sendMessage('trigger stream');

    render(MessageList);

    // Bouncing dots use animate-bounce; assert at least one is present.
    expect(document.querySelector('.animate-bounce')).not.toBeNull();
    // Empty placeholder must be hidden while streaming.
    expect(screen.queryByText('How can I help you today?')).not.toBeInTheDocument();

    release();
  });

  it('renders streamed partial content while streaming', async () => {
    await seed([]);
    sendMessageStream.mockImplementationOnce(
      async (_c, _m, _mode, _model, onEvent: (e: StreamEvent) => void) => {
        onEvent({ type: 'delta', delta: 'Partial streamed answer' });
        // Do not emit done — leave the stream open in the streaming state.
        await new Promise<void>(() => {});
      }
    );
    chatStore.startNewConversation();
    void chatStore.sendMessage('trigger stream');
    await Promise.resolve();

    render(MessageList);

    expect(screen.getByText('Partial streamed answer')).toBeInTheDocument();
  });
});
