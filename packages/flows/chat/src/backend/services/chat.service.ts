import { randomUUID } from 'crypto';
import { LLMClient, logger } from '@flows/core';
import type { ChatConversation, ChatMessage, ChatProviderGroup, ChatMode } from '@flows/shared';
import { chatDb } from '../database';

const log = logger.child({ module: 'ChatService' });

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
     * Send a message and get an AI response (non-streaming).
     */
    async sendMessage(
        conversationId: string,
        content: string,
        mode: ChatMode = 'specific',
        model?: string,
    ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
        log.info({ mode, model: model || 'auto', conversationId }, 'sendMessage');

        this.ensureConversation(conversationId, content);

        // Save user message
        const userMsg = this.createUserMessage(conversationId, content);
        chatDb.addMessage(userMsg);

        // Build context and generate
        const llmMessages = this.buildLLMMessages(conversationId);

        const response =
            mode === 'rotation'
                ? await this.getRotationClient().generate({ messages: llmMessages })
                : await LLMClient.generateForProvider(model!, { messages: llmMessages });

        log.info({ provider: response.provider, model: response.model, latencyMs: response.latencyMs, tokens: response.usage.totalTokens }, 'sendMessage: response');

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
    }

    /**
     * Streaming version of sendMessage.
     * Yields SSE `data: {...}\n\n` lines which the route writes to the response stream.
     */
    async *sendMessageStream(
        conversationId: string,
        content: string,
        mode: ChatMode = 'specific',
        model?: string,
    ): AsyncGenerator<string> {
        log.info({ mode, model: model || 'auto', conversationId }, 'sendMessageStream: start');

        this.ensureConversation(conversationId, content);

        // Save user message
        const userMsg = this.createUserMessage(conversationId, content);
        chatDb.addMessage(userMsg);
        yield `data: ${JSON.stringify({ type: 'user_message', message: userMsg })}\n\n`;

        // Build context and stream
        const llmMessages = this.buildLLMMessages(conversationId);
        const stream =
            mode === 'rotation'
                ? this.getRotationClient().generateStream({ messages: llmMessages })
                : LLMClient.generateStreamForProvider(model!, { messages: llmMessages });

        let fullContent = '';
        let providerUsed = '';
        let modelUsed = '';

        for await (const event of stream) {
            if (event.done && event.response) {
                providerUsed = event.response.provider;
                modelUsed = event.response.model;
            } else if (event.delta) {
                fullContent += event.delta;
                yield `data: ${JSON.stringify({ type: 'delta', delta: event.delta })}\n\n`;
            }
        }

        // Save assistant message
        const assistantMsg: ChatMessage = {
            id: randomUUID(),
            conversationId,
            role: 'assistant',
            content: fullContent,
            modelUsed,
            providerUsed,
            createdAt: Date.now(),
        };
        chatDb.addMessage(assistantMsg);

        log.info({ provider: providerUsed, model: modelUsed, chars: fullContent.length }, 'sendMessageStream: done');
        yield `data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`;
    }

    // ── Private helpers ──────────────────────────────────────────────

    private ensureConversation(conversationId: string, content: string): void {
        const existing = chatDb.getConversations().find((c) => c.id === conversationId);
        if (!existing) {
            chatDb.createConversation({
                id: conversationId,
                title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }
    }

    private createUserMessage(conversationId: string, content: string): ChatMessage {
        return {
            id: randomUUID(),
            conversationId,
            role: 'user',
            content,
            modelUsed: '',
            createdAt: Date.now(),
        };
    }

    private buildLLMMessages(conversationId: string) {
        const history = chatDb.getMessages(conversationId);
        return [
            {
                role: 'system' as const,
                content:
                    'You are a helpful AI assistant. Format your replies using standard Markdown. ' +
                    'Never start your reply with a heading (# or ## or ###). Begin with normal text.',
            },
            ...history.map((msg) => ({
                role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
                content: msg.content,
            })),
        ];
    }

    private getRotationClient(): LLMClient {
        if (!this.rotationClient) {
            this.rotationClient = LLMClient.createRotation();
        }
        return this.rotationClient;
    }
}
