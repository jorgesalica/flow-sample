import { randomUUID } from 'crypto';
import { LLMClient } from '@flows/core';
import type { ChatConversation, ChatMessage, ChatProviderGroup, ChatMode } from '@flows/shared';
import { chatDb } from '../database';

export class ChatService {
    private rotationClient: LLMClient | null = null;

    /**
     * Get model catalog grouped by provider (for the provider/model selector).
     */
    getModelCatalog(): ChatProviderGroup[] {
        return LLMClient.getModelCatalogGrouped().map((g) => ({
            provider: g.provider,
            models: g.models.map((m) => ({
                id: m.id,
                name: m.name,
                tier: m.tier,
                pricing: m.pricing,
                contextWindow: m.contextWindow,
                description: m.description,
            })),
        }));
    }

    /**
     * Fetch all conversations.
     */
    getConversations(): ChatConversation[] {
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
        return chatDb.getMessages(conversationId);
    }

    /**
     * Send a message and get an AI response.
     *
     * @param mode — 'rotation' cycles free providers, 'specific' uses the given model
     * @param model — 'provider:model' format for specific mode (e.g. "groq:llama-3.3-70b-versatile")
     */
    async sendMessage(
        conversationId: string,
        content: string,
        mode: ChatMode = 'specific',
        model?: string,
    ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
        console.log(`[ChatService] mode=${mode} model=${model || 'auto'} conv=${conversationId}`);

        // 1. Create or ensure conversation exists
        const existing = chatDb.getConversations().find((c) => c.id === conversationId);
        if (!existing) {
            chatDb.createConversation({
                id: conversationId,
                title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        // 2. Save user message
        const userMsg: ChatMessage = {
            id: randomUUID(),
            conversationId,
            role: 'user',
            content,
            modelUsed: '',
            createdAt: Date.now(),
        };
        chatDb.addMessage(userMsg);

        // 3. Build context
        const history = chatDb.getMessages(conversationId);
        const llmMessages = [
            {
                role: 'system' as const,
                content: 'You are a helpful AI assistant. Format your replies using standard Markdown.',
            },
            ...history.map((msg) => ({
                role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
                content: msg.content,
            })),
        ];

        // 4. Generate based on mode
        try {
            const response =
                mode === 'rotation'
                    ? await this.getRotationClient().generate({ messages: llmMessages })
                    : await LLMClient.generateForProvider(model!, { messages: llmMessages });

            console.log(
                `[ChatService] ${response.provider}/${response.model} responded in ${response.latencyMs}ms (${response.usage.totalTokens} tokens)`,
            );

            // 5. Save assistant message
            const assistantMsg: ChatMessage = {
                id: randomUUID(),
                conversationId,
                role: 'assistant',
                content: response.content,
                modelUsed: response.model,
                providerUsed: response.provider,
                createdAt: Date.now(),
            };
            chatDb.addMessage(assistantMsg);

            return { userMessage: userMsg, assistantMessage: assistantMsg };
        } catch (error) {
            console.error('[ChatService] LLM error:', error);
            throw error;
        }
    }

    // ── Private ──────────────────────────────────────────────────────

    private getRotationClient(): LLMClient {
        if (!this.rotationClient) {
            this.rotationClient = LLMClient.createRotation();
        }
        return this.rotationClient;
    }
}
