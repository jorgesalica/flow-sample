import { randomUUID } from 'crypto';
import { createLLMClient } from '@flows/core';
import type { ChatConversation, ChatMessage, ChatProviderOption } from '@flows/shared';
import { chatDb } from '../database';

export class ChatService {
    private llmClient;

    constructor() {
        this.llmClient = createLLMClient();
    }

    /**
     * Get available models dynamically from the connected LLM provider
     */
    async getModels(): Promise<ChatProviderOption[]> {
        try {
            const models = await this.llmClient.listModels();
            return models.map(id => {
                // Formatting name nicely e.g. gemini-2.5-flash -> Gemini 2.5 Flash
                let name = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                return { id, name, provider: this.llmClient.providerName };
            });
        } catch (e) {
            console.error('[ChatService] Failed to list models:', e);
            return [];
        }
    }

    /**
     * Fetch all conversations.
     */
    getConversations(): ChatConversation[] {
        console.log('[ChatService] Fetching all conversations...');
        return chatDb.getConversations();
    }

    /**
     * Delete a conversation.
     */
    deleteConversation(id: string): void {
        chatDb.deleteConversation(id);
    }

    /**
     * Fetch messages for a conversation.
     */
    getMessages(conversationId: string): ChatMessage[] {
        console.log(`[ChatService] Fetching messages for conversation: ${conversationId}`);
        return chatDb.getMessages(conversationId);
    }

    /**
     * Send a message and get an AI response.
     */
    async sendMessage(conversationId: string, content: string, requestedModel?: string): Promise<{ userMessage: ChatMessage, assistantMessage: ChatMessage }> {
        console.log(`[ChatService] Sending message to ${conversationId} using model ${requestedModel || this.llmClient.defaultModel}...`);

        // 1. Create or ensure conversation exists
        let isNew = false;
        try {
            const existing = chatDb.getConversations().find(c => c.id === conversationId);
            if (!existing) {
                isNew = true;
                chatDb.createConversation({
                    id: conversationId,
                    title: content.slice(0, 30) + (content.length > 30 ? '...' : ''), // Auto-title from first msg
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        } catch (e) {
            console.error("Error creating conversation", e);
            throw e;
        }

        // 2. Save user message
        const userMsg: ChatMessage = {
            id: randomUUID(),
            conversationId,
            role: 'user',
            content,
            modelUsed: '', // User messages don't use models
            createdAt: Date.now()
        };
        chatDb.addMessage(userMsg);

        // 3. Build context from previous messages + system prompt
        const history = chatDb.getMessages(conversationId);

        const llmMessages = [
            { role: 'system' as const, content: 'You are a helpful AI assistant. Format your replies using standard Markdown.' },
            ...history.map(msg => ({
                role: msg.role === 'system' ? 'system' as const : msg.role === 'user' ? 'user' as const : 'assistant' as const,
                content: msg.content
            }))
        ];

        // 4. Generate LLM response
        console.log(`[ChatService] Calling LLM API (${llmMessages.length} messages in context)...`);
        try {
            const response = await this.llmClient.generate({
                messages: llmMessages,
                model: requestedModel || this.llmClient.defaultModel
            });
            console.log(`[ChatService] LLM API responded in ${response.latencyMs}ms (${response.usage.totalTokens} tokens)`);

            // 5. Save assistant message
            const assistantMsg: ChatMessage = {
                id: randomUUID(),
                conversationId,
                role: 'assistant',
                content: response.content,
                modelUsed: response.model,
                createdAt: Date.now()
            };
            chatDb.addMessage(assistantMsg);

            return { userMessage: userMsg, assistantMessage: assistantMsg };
        } catch (error) {
            console.error('[ChatService] Error generating LLM response:', error);
            throw error;
        }
    }
}
