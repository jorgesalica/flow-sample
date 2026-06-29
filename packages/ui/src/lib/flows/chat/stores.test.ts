import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatConversation, ChatMessage, ChatProviderGroup } from '@flows/shared';
import type { StreamEvent } from './api';

// ── Mock the edge: the flow's api.ts (typed Eden client) and the toast helper ──
vi.mock('./api', () => ({
  fetchModelCatalog: vi.fn(),
  fetchConversations: vi.fn(),
  fetchMessages: vi.fn(),
  deleteConversation: vi.fn(),
  sendMessageStream: vi.fn(),
}));

vi.mock('@lib/toast', () => ({
  showError: vi.fn(),
}));

import * as api from './api';
import { showError } from '@lib/toast';
import { chatStore, type ChatInitialData } from './stores.svelte';

// ── Fixtures (fixed, deterministic, no PII) ──────────────────────────
function makeCatalog(): ChatProviderGroup[] {
  return [
    {
      provider: 'openai',
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          tier: 'very_high',
          pricing: 'paid',
          contextWindow: 128000,
        },
      ],
    },
    {
      provider: 'anthropic',
      models: [
        {
          id: 'claude-3',
          name: 'Claude 3',
          tier: 'high',
          pricing: 'paid',
          contextWindow: 200000,
        },
      ],
    },
  ];
}

function makeConversation(over: Partial<ChatConversation> = {}): ChatConversation {
  return {
    id: 'conv-1',
    title: 'First chat',
    createdAt: 1_000,
    updatedAt: 2_000,
    ...over,
  };
}

function makeMessage(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Hello there',
    modelUsed: 'gpt-4o',
    providerUsed: 'openai',
    createdAt: 3_000,
    ...over,
  };
}

/** A loader-shaped payload to seed the store via hydrate(). */
function makeInitialData(over: Partial<ChatInitialData> = {}): ChatInitialData {
  return {
    catalog: [],
    conversations: [],
    selectedModel: '',
    ...over,
  };
}

const fetchConversations = vi.mocked(api.fetchConversations);
const fetchMessages = vi.mocked(api.fetchMessages);
const deleteConversation = vi.mocked(api.deleteConversation);
const sendMessageStream = vi.mocked(api.sendMessageStream);
const mockShowError = vi.mocked(showError);

/**
 * The store is a module-level singleton; reset its observable state before each
 * test by re-hydrating with empty data and driving it back to an idle baseline.
 */
function resetStore() {
  chatStore.hydrate(makeInitialData());
  chatStore.setMode('specific');
  chatStore.setModel('');
  chatStore.activeConversationId = null;
  chatStore.messages = [];
  chatStore.lastProvider = '';
  chatStore.lastModel = '';
  chatStore.isLoading = false;
  chatStore.isStreaming = false;
  chatStore.streamingContent = '';
}

describe('chatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  describe('hydrate', () => {
    it('seeds catalog, conversations, and the selected model from loader data', () => {
      const catalog = makeCatalog();
      const conversations = [makeConversation()];

      chatStore.hydrate({ catalog, conversations, selectedModel: 'openai:gpt-4o' });

      expect(chatStore.catalog).toEqual(catalog);
      expect(chatStore.conversations).toEqual(conversations);
      expect(chatStore.selectedModel).toBe('openai:gpt-4o');
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('seeds empty defaults when the loader returns nothing', () => {
      chatStore.hydrate(makeInitialData());

      expect(chatStore.catalog).toEqual([]);
      expect(chatStore.conversations).toEqual([]);
      expect(chatStore.selectedModel).toBe('');
    });
  });

  describe('setModel / setMode', () => {
    it('updates the selected model', () => {
      chatStore.setModel('anthropic:claude-3');
      expect(chatStore.selectedModel).toBe('anthropic:claude-3');
    });

    it('updates the chat mode', () => {
      chatStore.setMode('rotation');
      expect(chatStore.chatMode).toBe('rotation');
      chatStore.setMode('specific');
      expect(chatStore.chatMode).toBe('specific');
    });
  });

  describe('startNewConversation', () => {
    it('assigns a fresh active conversation id and clears messages', () => {
      const id = chatStore.startNewConversation();
      expect(id).toBeTruthy();
      expect(chatStore.activeConversationId).toBe(id);
      expect(chatStore.messages).toEqual([]);
    });
  });

  describe('loadConversation', () => {
    it('sets the active id and loads its messages', async () => {
      const messages = [makeMessage()];
      fetchMessages.mockResolvedValueOnce(messages);

      await chatStore.loadConversation('conv-1');

      expect(chatStore.activeConversationId).toBe('conv-1');
      expect(chatStore.messages).toEqual(messages);
      expect(chatStore.isLoading).toBe(false);
      expect(fetchMessages).toHaveBeenCalledWith('conv-1');
    });

    it('resets isLoading and toasts on failure', async () => {
      fetchMessages.mockRejectedValueOnce(new Error('not found'));

      await chatStore.loadConversation('conv-x');

      expect(chatStore.isLoading).toBe(false);
      expect(mockShowError).toHaveBeenCalledWith('not found');
    });
  });

  describe('deleteConversation', () => {
    it('removes the conversation and clears active state when it was active', async () => {
      // Seed conversations + active id via hydrate + load
      chatStore.hydrate(
        makeInitialData({
          conversations: [
            makeConversation({ id: 'conv-1' }),
            makeConversation({ id: 'conv-2', title: 'Second' }),
          ],
        })
      );
      fetchMessages.mockResolvedValueOnce([makeMessage()]);
      await chatStore.loadConversation('conv-1');
      deleteConversation.mockResolvedValueOnce(undefined);

      await chatStore.deleteConversation('conv-1');

      expect(chatStore.conversations.map((c) => c.id)).toEqual(['conv-2']);
      expect(chatStore.activeConversationId).toBeNull();
      expect(chatStore.messages).toEqual([]);
    });

    it('keeps active state when deleting a non-active conversation', async () => {
      chatStore.hydrate(
        makeInitialData({
          conversations: [
            makeConversation({ id: 'conv-1' }),
            makeConversation({ id: 'conv-2', title: 'Second' }),
          ],
        })
      );
      fetchMessages.mockResolvedValueOnce([makeMessage()]);
      await chatStore.loadConversation('conv-1');
      deleteConversation.mockResolvedValueOnce(undefined);

      await chatStore.deleteConversation('conv-2');

      expect(chatStore.conversations.map((c) => c.id)).toEqual(['conv-1']);
      expect(chatStore.activeConversationId).toBe('conv-1');
      expect(chatStore.messages).toHaveLength(1);
    });

    it('toasts and does not mutate the list when delete fails', async () => {
      chatStore.hydrate(makeInitialData({ conversations: [makeConversation({ id: 'conv-1' })] }));
      deleteConversation.mockRejectedValueOnce(new Error('delete failed'));

      await chatStore.deleteConversation('conv-1');

      expect(chatStore.conversations.map((c) => c.id)).toEqual(['conv-1']);
      expect(mockShowError).toHaveBeenCalledWith('delete failed');
    });
  });

  describe('sendMessage (streaming)', () => {
    it('starts a new conversation when none is active', async () => {
      sendMessageStream.mockResolvedValueOnce(undefined);

      await chatStore.sendMessage('Hi');

      expect(chatStore.activeConversationId).toBeTruthy();
      expect(sendMessageStream).toHaveBeenCalledTimes(1);
    });

    it('passes the selected model in specific mode and undefined in rotation', async () => {
      chatStore.setMode('specific');
      chatStore.setModel('openai:gpt-4o');
      chatStore.startNewConversation();
      sendMessageStream.mockResolvedValueOnce(undefined);

      await chatStore.sendMessage('specific msg');

      expect(sendMessageStream).toHaveBeenLastCalledWith(
        expect.any(String),
        'specific msg',
        'specific',
        'openai:gpt-4o',
        expect.any(Function),
        expect.any(AbortSignal)
      );

      chatStore.setMode('rotation');
      chatStore.startNewConversation();
      sendMessageStream.mockResolvedValueOnce(undefined);

      await chatStore.sendMessage('rotation msg');

      expect(sendMessageStream).toHaveBeenLastCalledWith(
        expect.any(String),
        'rotation msg',
        'rotation',
        undefined,
        expect.any(Function),
        expect.any(AbortSignal)
      );
    });

    it('stopStreaming aborts the request signal and resets streaming flags', async () => {
      chatStore.startNewConversation();
      let capturedSignal: AbortSignal | undefined;
      // Hold the stream open until aborted; resolve on abort like the real
      // api layer does (a user stop is a clean end of stream, not an error).
      sendMessageStream.mockImplementationOnce(
        (_c, _m, _mode, _model, _onEvent, signal?: AbortSignal) => {
          capturedSignal = signal;
          return new Promise<void>((resolve) => {
            signal?.addEventListener('abort', () => resolve());
          });
        }
      );

      const pending = chatStore.sendMessage('long answer');
      // streaming is in progress
      expect(chatStore.isStreaming).toBe(true);

      chatStore.stopStreaming();

      expect(capturedSignal?.aborted).toBe(true);
      expect(chatStore.isStreaming).toBe(false);
      expect(chatStore.isLoading).toBe(false);
      expect(chatStore.streamingContent).toBe('');
      await pending;
    });

    it('appends an optimistic user message immediately', async () => {
      chatStore.startNewConversation();
      let observedDuringStream = -1;
      sendMessageStream.mockImplementationOnce(async () => {
        observedDuringStream = chatStore.messages.length;
      });

      await chatStore.sendMessage('optimistic');

      expect(observedDuringStream).toBe(1);
    });

    it('replaces the temp user message on user_message and appends assistant on done', async () => {
      chatStore.startNewConversation();
      const serverUserMsg = makeMessage({
        id: 'server-user',
        role: 'user',
        content: 'real question',
        modelUsed: '',
      });
      const assistantMsg = makeMessage({
        id: 'assistant-1',
        role: 'assistant',
        content: 'an answer',
        modelUsed: 'gpt-4o',
        providerUsed: 'openai',
      });

      fetchConversations.mockResolvedValue([]);
      sendMessageStream.mockImplementationOnce(
        async (_c, _m, _mode, _model, onEvent: (e: StreamEvent) => void) => {
          onEvent({ type: 'user_message', message: serverUserMsg });
          onEvent({ type: 'delta', delta: 'an ' });
          onEvent({ type: 'delta', delta: 'answer' });
          onEvent({ type: 'done', message: assistantMsg });
        }
      );

      await chatStore.sendMessage('real question');

      expect(chatStore.messages).toContainEqual(serverUserMsg);
      expect(chatStore.messages).toContainEqual(assistantMsg);
      // No leftover temp message
      expect(chatStore.messages.some((m) => m.id.startsWith('temp-'))).toBe(false);
      expect(chatStore.lastProvider).toBe('openai');
      expect(chatStore.lastModel).toBe('gpt-4o');
      expect(chatStore.isStreaming).toBe(false);
      expect(chatStore.isLoading).toBe(false);
      expect(chatStore.streamingContent).toBe('');
    });

    it('accumulates delta content into streamingContent', async () => {
      chatStore.startNewConversation();
      let contentDuringStream = '';
      sendMessageStream.mockImplementationOnce(
        async (_c, _m, _mode, _model, onEvent: (e: StreamEvent) => void) => {
          onEvent({ type: 'delta', delta: 'foo' });
          onEvent({ type: 'delta', delta: 'bar' });
          contentDuringStream = chatStore.streamingContent;
        }
      );

      await chatStore.sendMessage('hi');

      expect(contentDuringStream).toBe('foobar');
    });

    it('handles an error event by clearing streaming flags and toasting', async () => {
      chatStore.startNewConversation();
      sendMessageStream.mockImplementationOnce(
        async (_c, _m, _mode, _model, onEvent: (e: StreamEvent) => void) => {
          onEvent({ type: 'error', error: 'model exploded' });
        }
      );

      await chatStore.sendMessage('hi');

      expect(chatStore.isStreaming).toBe(false);
      expect(chatStore.isLoading).toBe(false);
      expect(chatStore.streamingContent).toBe('');
      expect(mockShowError).toHaveBeenCalledWith('model exploded');
    });

    it('rolls back the optimistic message and toasts when the stream call rejects', async () => {
      chatStore.startNewConversation();
      sendMessageStream.mockRejectedValueOnce(new Error('network gone'));

      await chatStore.sendMessage('will fail');

      expect(chatStore.messages.some((m) => m.id.startsWith('temp-'))).toBe(false);
      expect(chatStore.isStreaming).toBe(false);
      expect(chatStore.isLoading).toBe(false);
      expect(mockShowError).toHaveBeenCalledWith('network gone');
    });
  });
});
