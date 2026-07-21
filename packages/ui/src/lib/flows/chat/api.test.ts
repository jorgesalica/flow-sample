import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatConversation, ChatMessage, ChatProviderGroup } from '@flows/shared';

const mocks = vi.hoisted(() => ({
  modelsGet: vi.fn(),
  conversationsGet: vi.fn(),
  messagesGet: vi.fn(),
  conversationDelete: vi.fn(),
  messagePost: vi.fn(),
}));

vi.mock('@lib/client', () => {
  const conversations = Object.assign(
    () => ({ get: mocks.messagesGet, delete: mocks.conversationDelete }),
    { get: mocks.conversationsGet }
  );

  return {
    api: {
      api: {
        chat: {
          models: { get: mocks.modelsGet },
          conversations,
          message: { post: mocks.messagePost },
        },
      },
    },
  };
});

const {
  deleteConversation,
  fetchConversations,
  fetchMessages,
  fetchModelCatalog,
  sendMessage,
  sendMessageStream,
} = await import('./api');

const conversation: ChatConversation = {
  id: 'conv-1',
  title: 'Test chat',
  createdAt: 1,
  updatedAt: 2,
};

const userMessage: ChatMessage = {
  id: 'm1',
  conversationId: conversation.id,
  role: 'user',
  content: 'Hello',
  modelUsed: '',
  createdAt: 3,
};

const assistantMessage: ChatMessage = {
  id: 'm2',
  conversationId: conversation.id,
  role: 'assistant',
  content: 'Hi',
  modelUsed: 'model',
  providerUsed: 'provider',
  createdAt: 4,
};

const catalog: ChatProviderGroup[] = [
  {
    provider: 'provider',
    models: [
      {
        id: 'model',
        name: 'Model',
        tier: 'high',
        pricing: 'free',
        contextWindow: 8192,
      },
    ],
  },
];

describe('Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns typed catalog, conversation, and message responses', async () => {
    mocks.modelsGet.mockResolvedValue({ data: catalog, error: null });
    mocks.conversationsGet.mockResolvedValue({ data: [conversation], error: null });
    mocks.messagesGet.mockResolvedValue({ data: [userMessage], error: null });

    await expect(fetchModelCatalog()).resolves.toEqual(catalog);
    await expect(fetchConversations()).resolves.toEqual([conversation]);
    await expect(fetchMessages(conversation.id)).resolves.toEqual([userMessage]);
  });

  it('returns the typed send response and forwards request fields', async () => {
    mocks.messagePost.mockResolvedValue({
      data: { userMessage, assistantMessage },
      error: null,
    });

    await expect(
      sendMessage(conversation.id, 'Hello', 'specific', 'provider:model')
    ).resolves.toEqual({ userMessage, assistantMessage });
    expect(mocks.messagePost).toHaveBeenCalledWith({
      conversationId: conversation.id,
      message: 'Hello',
      mode: 'specific',
      model: 'provider:model',
    });
  });

  it('forwards deletes and surfaces stable Eden errors', async () => {
    mocks.conversationDelete.mockResolvedValue({ data: { success: true }, error: null });
    await expect(deleteConversation(conversation.id)).resolves.toBeUndefined();

    mocks.modelsGet.mockResolvedValue({
      data: null,
      error: { value: { error: 'AI response is temporarily unavailable' } },
    });
    await expect(fetchModelCatalog()).rejects.toThrow('AI response is temporarily unavailable');
  });

  it('delivers only valid typed SSE events', async () => {
    const body = [
      `data: ${JSON.stringify({ type: 'user_message', message: userMessage })}`,
      `data: ${JSON.stringify({ type: 'delta', delta: 'Hi' })}`,
      'data: {bad json}',
      `data: ${JSON.stringify({ type: 'done', message: { id: 42 } })}`,
      `data: ${JSON.stringify({ type: 'done', message: assistantMessage })}`,
      '',
    ].join('\n\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    const onEvent = vi.fn();

    await sendMessageStream(conversation.id, 'Hello', 'rotation', undefined, onEvent);

    expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual([
      'user_message',
      'delta',
      'done',
    ]);
  });

  it('rejects non-successful stream setup responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'A model must be selected.' }), { status: 400 })
        )
    );

    await expect(
      sendMessageStream(conversation.id, 'Hello', 'specific', undefined, vi.fn())
    ).rejects.toThrow('Stream error 400');
  });
});
