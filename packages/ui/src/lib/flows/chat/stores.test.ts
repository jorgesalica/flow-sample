import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
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
import { chatStore } from './stores';

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

const fetchModelCatalog = vi.mocked(api.fetchModelCatalog);
const fetchConversations = vi.mocked(api.fetchConversations);
const fetchMessages = vi.mocked(api.fetchMessages);
const deleteConversation = vi.mocked(api.deleteConversation);
const sendMessageStream = vi.mocked(api.sendMessageStream);
const mockShowError = vi.mocked(showError);

/**
 * The store is a module-level singleton; reset its observable state before each
 * test by driving it through its own public methods so tests stay isolated.
 */
async function resetStore() {
  fetchModelCatalog.mockResolvedValueOnce([]);
  fetchConversations.mockResolvedValueOnce([]);
  await chatStore.init();
  chatStore.setMode('specific');
  chatStore.setModel('');
  // Clear messages / active conversation
  chatStore.startNewConversation();
  chatStore.deleteConversation(get(chatStore).activeConversationId ?? 'none');
  await Promise.resolve();
}

describe('chatStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetStore();
    vi.clearAllMocks();
  });

  describe('init', () => {
    it('loads catalog + conversations and defaults to first model of first provider', async () => {
      const catalog = makeCatalog();
      const conversations = [makeConversation()];
      fetchModelCatalog.mockResolvedValueOnce(catalog);
      fetchConversations.mockResolvedValueOnce(conversations);

      await chatStore.init();

      const state = get(chatStore);
      expect(state.catalog).toEqual(catalog);
      expect(state.conversations).toEqual(conversations);
      expect(state.selectedModel).toBe('openai:gpt-4o');
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('leaves selectedModel empty when the catalog is empty', async () => {
      fetchModelCatalog.mockResolvedValueOnce([]);
      fetchConversations.mockResolvedValueOnce([]);

      await chatStore.init();

      expect(get(chatStore).selectedModel).toBe('');
    });

    it('leaves selectedModel empty when first provider has no models', async () => {
      fetchModelCatalog.mockResolvedValueOnce([{ provider: 'empty', models: [] }]);
      fetchConversations.mockResolvedValueOnce([]);

      await chatStore.init();

      expect(get(chatStore).selectedModel).toBe('');
    });

    it('surfaces a toast error and does not throw when the API fails', async () => {
      fetchModelCatalog.mockRejectedValueOnce(new Error('backend down'));
      fetchConversations.mockResolvedValueOnce([]);

      await chatStore.init();

      expect(mockShowError).toHaveBeenCalledWith('backend down');
    });
  });

  describe('setModel / setMode', () => {
    it('updates the selected model', () => {
      chatStore.setModel('anthropic:claude-3');
      expect(get(chatStore).selectedModel).toBe('anthropic:claude-3');
    });

    it('updates the chat mode', () => {
      chatStore.setMode('rotation');
      expect(get(chatStore).chatMode).toBe('rotation');
      chatStore.setMode('specific');
      expect(get(chatStore).chatMode).toBe('specific');
    });
  });

  describe('startNewConversation', () => {
    it('assigns a fresh active conversation id and clears messages', () => {
      const id = chatStore.startNewConversation();
      const state = get(chatStore);
      expect(id).toBeTruthy();
      expect(state.activeConversationId).toBe(id);
      expect(state.messages).toEqual([]);
    });
  });

  describe('loadConversation', () => {
    it('sets the active id and loads its messages', async () => {
      const messages = [makeMessage()];
      fetchMessages.mockResolvedValueOnce(messages);

      await chatStore.loadConversation('conv-1');

      const state = get(chatStore);
      expect(state.activeConversationId).toBe('conv-1');
      expect(state.messages).toEqual(messages);
      expect(state.isLoading).toBe(false);
      expect(fetchMessages).toHaveBeenCalledWith('conv-1');
    });

    it('resets isLoading and toasts on failure', async () => {
      fetchMessages.mockRejectedValueOnce(new Error('not found'));

      await chatStore.loadConversation('conv-x');

      expect(get(chatStore).isLoading).toBe(false);
      expect(mockShowError).toHaveBeenCalledWith('not found');
    });
  });

  describe('deleteConversation', () => {
    it('removes the conversation and clears active state when it was active', async () => {
      // Seed conversations + active id via init + load
      fetchModelCatalog.mockResolvedValueOnce([]);
      fetchConversations.mockResolvedValueOnce([
        makeConversation({ id: 'conv-1' }),
        makeConversation({ id: 'conv-2', title: 'Second' }),
      ]);
      await chatStore.init();
      fetchMessages.mockResolvedValueOnce([makeMessage()]);
      await chatStore.loadConversation('conv-1');
      deleteConversation.mockResolvedValueOnce(undefined);

      await chatStore.deleteConversation('conv-1');

      const state = get(chatStore);
      expect(state.conversations.map((c) => c.id)).toEqual(['conv-2']);
      expect(state.activeConversationId).toBeNull();
      expect(state.messages).toEqual([]);
    });

    it('keeps active state when deleting a non-active conversation', async () => {
      fetchModelCatalog.mockResolvedValueOnce([]);
      fetchConversations.mockResolvedValueOnce([
        makeConversation({ id: 'conv-1' }),
        makeConversation({ id: 'conv-2', title: 'Second' }),
      ]);
      await chatStore.init();
      fetchMessages.mockResolvedValueOnce([makeMessage()]);
      await chatStore.loadConversation('conv-1');
      deleteConversation.mockResolvedValueOnce(undefined);

      await chatStore.deleteConversation('conv-2');

      const state = get(chatStore);
      expect(state.conversations.map((c) => c.id)).toEqual(['conv-1']);
      expect(state.activeConversationId).toBe('conv-1');
      expect(state.messages).toHaveLength(1);
    });

    it('toasts and does not mutate the list when delete fails', async () => {
      fetchModelCatalog.mockResolvedValueOnce([]);
      fetchConversations.mockResolvedValueOnce([makeConversation({ id: 'conv-1' })]);
      await chatStore.init();
      deleteConversation.mockRejectedValueOnce(new Error('delete failed'));

      await chatStore.deleteConversation('conv-1');

      expect(get(chatStore).conversations.map((c) => c.id)).toEqual(['conv-1']);
      expect(mockShowError).toHaveBeenCalledWith('delete failed');
    });
  });

  describe('sendMessage (streaming)', () => {
    it('starts a new conversation when none is active', async () => {
      sendMessageStream.mockResolvedValueOnce(undefined);

      await chatStore.sendMessage('Hi');

      expect(get(chatStore).activeConversationId).toBeTruthy();
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
        expect.any(Function)
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
        expect.any(Function)
      );
    });

    it('appends an optimistic user message immediately', async () => {
      chatStore.startNewConversation();
      let observedDuringStream = -1;
      sendMessageStream.mockImplementationOnce(async () => {
        observedDuringStream = get(chatStore).messages.length;
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

      const state = get(chatStore);
      expect(state.messages).toContainEqual(serverUserMsg);
      expect(state.messages).toContainEqual(assistantMsg);
      // No leftover temp message
      expect(state.messages.some((m) => m.id.startsWith('temp-'))).toBe(false);
      expect(state.lastProvider).toBe('openai');
      expect(state.lastModel).toBe('gpt-4o');
      expect(state.isStreaming).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.streamingContent).toBe('');
    });

    it('accumulates delta content into streamingContent', async () => {
      chatStore.startNewConversation();
      let contentDuringStream = '';
      sendMessageStream.mockImplementationOnce(
        async (_c, _m, _mode, _model, onEvent: (e: StreamEvent) => void) => {
          onEvent({ type: 'delta', delta: 'foo' });
          onEvent({ type: 'delta', delta: 'bar' });
          contentDuringStream = get(chatStore).streamingContent;
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

      const state = get(chatStore);
      expect(state.isStreaming).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.streamingContent).toBe('');
      expect(mockShowError).toHaveBeenCalledWith('model exploded');
    });

    it('rolls back the optimistic message and toasts when the stream call rejects', async () => {
      chatStore.startNewConversation();
      sendMessageStream.mockRejectedValueOnce(new Error('network gone'));

      await chatStore.sendMessage('will fail');

      const state = get(chatStore);
      expect(state.messages.some((m) => m.id.startsWith('temp-'))).toBe(false);
      expect(state.isStreaming).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(mockShowError).toHaveBeenCalledWith('network gone');
    });
  });
});
