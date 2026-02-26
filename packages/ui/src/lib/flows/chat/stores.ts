import { writable, get } from 'svelte/store';
import type { ChatConversation, ChatMessage, ChatProviderOption } from '@flows/shared';
import * as api from './api';

function createChatStore() {
    const { subscribe, update } = writable<{
        models: ChatProviderOption[];
        selectedModel: string;
        conversations: ChatConversation[];
        activeConversationId: string | null;
        messages: ChatMessage[];
        isLoading: boolean;
        error: string | null;
    }>({
        models: [],
        selectedModel: '',
        conversations: [],
        activeConversationId: null,
        messages: [],
        isLoading: false,
        error: null
    });

    return {
        subscribe,

        async init() {
            try {
                const [models, conversations] = await Promise.all([
                    api.fetchModels(),
                    api.fetchConversations()
                ]);

                let defaultModel = '';
                if (models.length > 0) {
                    defaultModel = models[0].id; // default to first
                }

                update(s => ({
                    ...s,
                    models,
                    selectedModel: defaultModel,
                    conversations
                }));
            } catch (e: unknown) {
                update(s => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
            }
        },

        setModel(modelId: string) {
            update(s => ({ ...s, selectedModel: modelId }));
        },

        async loadConversation(id: string) {
            update(s => ({ ...s, isLoading: true, activeConversationId: id, messages: [], error: null }));
            try {
                const messages = await api.fetchMessages(id);
                update(s => ({ ...s, messages, isLoading: false }));
            } catch (e: unknown) {
                update(s => ({ ...s, error: e instanceof Error ? e.message : String(e), isLoading: false }));
            }
        },

        startNewConversation() {
            // we don't save to DB until first message, just reset UI
            const newId = crypto.randomUUID();
            update(s => ({
                ...s,
                activeConversationId: newId,
                messages: []
            }));
            return newId;
        },

        async deleteConversation(id: string) {
            try {
                await api.deleteConversation(id);
                update(s => {
                    const conversations = s.conversations.filter(c => c.id !== id);
                    const activeConversationId = s.activeConversationId === id ? null : s.activeConversationId;
                    const messages = s.activeConversationId === id ? [] : s.messages;
                    return { ...s, conversations, activeConversationId, messages };
                });
            } catch (e: unknown) {
                update(s => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
            }
        },

        async sendMessage(content: string) {
            const state = get(this);
            if (!state.activeConversationId) {
                this.startNewConversation();
            }

            // get updated state
            const currentState = get(this);
            const convId = currentState.activeConversationId!;
            const model = currentState.selectedModel;

            // Optimistic update for user message
            const tempUserMsg: ChatMessage = {
                id: 'temp-' + Date.now(),
                conversationId: convId,
                role: 'user',
                content,
                modelUsed: '',
                createdAt: Date.now()
            };

            update(s => ({
                ...s,
                messages: [...s.messages, tempUserMsg],
                isLoading: true
            }));

            try {
                const { userMessage, assistantMessage } = await api.sendMessage(convId, content, model);

                // Real update
                update(s => {
                    // Update messages: replace temp with real user msg, add assistant msg
                    const msgs = s.messages.filter(m => m.id !== tempUserMsg.id);
                    // Also refresh conversations (title might have changed or it's new)
                    api.fetchConversations().then(conversations => {
                        update(inner => ({ ...inner, conversations }));
                    });

                    return {
                        ...s,
                        messages: [...msgs, userMessage, assistantMessage],
                        isLoading: false
                    };
                });
            } catch (e: unknown) {
                update(s => {
                    // Remove temp on failure
                    const msgs = s.messages.filter(m => m.id !== tempUserMsg.id);
                    return { ...s, messages: msgs, error: e instanceof Error ? e.message : String(e), isLoading: false };
                });
            }
        }
    };
}

export const chatStore = createChatStore();
