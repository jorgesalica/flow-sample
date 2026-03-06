import { writable, get } from 'svelte/store';
import type { ChatConversation, ChatMessage, ChatProviderGroup, ChatMode } from '@flows/shared';
import * as api from './api';

function createChatStore() {
  const { subscribe, update } = writable<{
    catalog: ChatProviderGroup[];
    selectedModel: string; // "provider:modelId" format
    chatMode: ChatMode;
    lastProvider: string; // provider that answered last (for rotation badge)
    lastModel: string; // model that answered last
    conversations: ChatConversation[];
    activeConversationId: string | null;
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
  }>({
    catalog: [],
    selectedModel: '',
    chatMode: 'specific',
    lastProvider: '',
    lastModel: '',
    conversations: [],
    activeConversationId: null,
    messages: [],
    isLoading: false,
    error: null,
  });

  return {
    subscribe,

    async init() {
      try {
        const [catalog, conversations] = await Promise.all([
          api.fetchModelCatalog(),
          api.fetchConversations(),
        ]);

        // Default: first model of first provider
        let defaultModel = '';
        if (catalog.length > 0 && catalog[0].models.length > 0) {
          defaultModel = `${catalog[0].provider}:${catalog[0].models[0].id}`;
        }

        update((s) => ({
          ...s,
          catalog,
          selectedModel: defaultModel,
          conversations,
        }));
      } catch (e: unknown) {
        update((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
      }
    },

    setModel(providerAndModel: string) {
      update((s) => ({ ...s, selectedModel: providerAndModel }));
    },

    setMode(mode: ChatMode) {
      update((s) => ({ ...s, chatMode: mode }));
    },

    async loadConversation(id: string) {
      update((s) => ({
        ...s,
        isLoading: true,
        activeConversationId: id,
        messages: [],
        error: null,
      }));
      try {
        const messages = await api.fetchMessages(id);
        update((s) => ({ ...s, messages, isLoading: false }));
      } catch (e: unknown) {
        update((s) => ({
          ...s,
          error: e instanceof Error ? e.message : String(e),
          isLoading: false,
        }));
      }
    },

    startNewConversation() {
      const newId = crypto.randomUUID();
      update((s) => ({
        ...s,
        activeConversationId: newId,
        messages: [],
      }));
      return newId;
    },

    async deleteConversation(id: string) {
      try {
        await api.deleteConversation(id);
        update((s) => {
          const conversations = s.conversations.filter((c) => c.id !== id);
          const activeConversationId =
            s.activeConversationId === id ? null : s.activeConversationId;
          const messages = s.activeConversationId === id ? [] : s.messages;
          return { ...s, conversations, activeConversationId, messages };
        });
      } catch (e: unknown) {
        update((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
      }
    },

    async sendMessage(content: string) {
      const state = get(this);
      if (!state.activeConversationId) {
        this.startNewConversation();
      }

      const currentState = get(this);
      const convId = currentState.activeConversationId!;
      const mode = currentState.chatMode;
      const model = mode === 'specific' ? currentState.selectedModel : undefined;

      // Optimistic update
      const tempUserMsg: ChatMessage = {
        id: 'temp-' + Date.now(),
        conversationId: convId,
        role: 'user',
        content,
        modelUsed: '',
        createdAt: Date.now(),
      };

      update((s) => ({
        ...s,
        messages: [...s.messages, tempUserMsg],
        isLoading: true,
      }));

      try {
        const { userMessage, assistantMessage } = await api.sendMessage(
          convId,
          content,
          mode,
          model
        );

        update((s) => {
          const msgs = s.messages.filter((m) => m.id !== tempUserMsg.id);
          api.fetchConversations().then((conversations) => {
            update((inner) => ({ ...inner, conversations }));
          });

          return {
            ...s,
            messages: [...msgs, userMessage, assistantMessage],
            lastProvider: assistantMessage.providerUsed || '',
            lastModel: assistantMessage.modelUsed || '',
            isLoading: false,
          };
        });
      } catch (e: unknown) {
        update((s) => {
          const msgs = s.messages.filter((m) => m.id !== tempUserMsg.id);
          return {
            ...s,
            messages: msgs,
            error: e instanceof Error ? e.message : String(e),
            isLoading: false,
          };
        });
      }
    },
  };
}

export const chatStore = createChatStore();
