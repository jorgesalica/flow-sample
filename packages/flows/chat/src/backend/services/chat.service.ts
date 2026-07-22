import { randomUUID } from 'crypto';
import { LLMClient, logger } from '@flows/core';
import {
  CHAT_MODES,
  CHAT_STREAM_EVENT_TYPES,
  type ChatConversation,
  type ChatMessage,
  type ChatMode,
  type ChatProviderGroup,
  type ChatSendResponse,
  type ChatStreamEvent,
} from '@flows/shared';
import type { ChatRepository } from '../../domain/ports';
import { deriveConversationTitle } from '../../domain/conversation';
import { ChatError, ConversationNotFoundError } from '../../domain/errors';
import { CHAT_SYSTEM_PROMPT, DEFAULT_CHAT_MODE } from '../config';

const log = logger.child({ module: 'ChatService' });

export interface ChatApplication {
  getModelCatalog(): ChatProviderGroup[];
  getConversations(): ChatConversation[];
  deleteConversation(id: string): void;
  getMessages(conversationId: string): ChatMessage[];
  sendMessage(
    conversationId: string,
    content: string,
    mode?: ChatMode,
    model?: string,
  ): Promise<ChatSendResponse>;
  sendMessageStream(
    conversationId: string,
    content: string,
    mode?: ChatMode,
    model?: string,
  ): AsyncGenerator<ChatStreamEvent>;
}

export class ChatService implements ChatApplication {
  private rotationClient: LLMClient | null = null;

  constructor(private readonly repo: ChatRepository) {}

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
    return this.repo.getConversations();
  }

  /**
   * Delete a conversation.
   */
  deleteConversation(id: string): void {
    this.assertConversationExists(id);
    this.repo.deleteConversation(id);
  }

  /**
   * Fetch messages for a conversation.
   */
  getMessages(conversationId: string): ChatMessage[] {
    this.assertConversationExists(conversationId);
    return this.repo.getMessages(conversationId);
  }

  /**
   * Send a message and get an AI response (non-streaming).
   */
  async sendMessage(
    conversationId: string,
    content: string,
    mode: ChatMode = DEFAULT_CHAT_MODE,
    model?: string,
  ): Promise<ChatSendResponse> {
    log.info({ mode, model: model || 'auto', conversationId }, 'sendMessage');

    this.assertModelForMode(mode, model);
    this.ensureConversation(conversationId, content);
    // Save user message
    const userMsg = this.createUserMessage(conversationId, content);
    this.repo.addMessage(userMsg);

    // Build context and generate
    const llmMessages = this.buildLLMMessages(conversationId);

    const response =
      mode === CHAT_MODES.ROTATION
        ? await this.getRotationClient().generate({ messages: llmMessages })
        : await LLMClient.generateForProvider(model!, { messages: llmMessages });

    log.info(
      {
        provider: response.provider,
        model: response.model,
        latencyMs: response.latencyMs,
        tokens: response.usage.totalTokens,
      },
      'sendMessage: response',
    );

    const assistantMsg: ChatMessage = {
      id: randomUUID(),
      conversationId,
      role: 'assistant',
      content: response.content,
      modelUsed: response.model,
      providerUsed: response.provider,
      createdAt: Date.now(),
    };
    this.repo.addMessage(assistantMsg);

    return { userMessage: userMsg, assistantMessage: assistantMsg };
  }

  /**
   * Streaming version of sendMessage.
   * Yields SSE `data: {...}\n\n` lines which the route writes to the response stream.
   */
  sendMessageStream(
    conversationId: string,
    content: string,
    mode: ChatMode = DEFAULT_CHAT_MODE,
    model?: string,
  ): AsyncGenerator<ChatStreamEvent> {
    this.assertModelForMode(mode, model);
    return this.generateMessageStream(conversationId, content, mode, model);
  }

  private async *generateMessageStream(
    conversationId: string,
    content: string,
    mode: ChatMode,
    model?: string,
  ): AsyncGenerator<ChatStreamEvent> {
    log.info({ mode, model: model || 'auto', conversationId }, 'sendMessageStream: start');
    this.ensureConversation(conversationId, content);
    // Save user message
    const userMsg = this.createUserMessage(conversationId, content);
    this.repo.addMessage(userMsg);
    yield { type: CHAT_STREAM_EVENT_TYPES.USER_MESSAGE, message: userMsg };

    // Build context and stream
    const llmMessages = this.buildLLMMessages(conversationId);
    const stream =
      mode === CHAT_MODES.ROTATION
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
        yield { type: CHAT_STREAM_EVENT_TYPES.DELTA, delta: event.delta };
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
    this.repo.addMessage(assistantMsg);

    log.info(
      { provider: providerUsed, model: modelUsed, chars: fullContent.length },
      'sendMessageStream: done',
    );
    yield { type: CHAT_STREAM_EVENT_TYPES.DONE, message: assistantMsg };
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Guard: in "specific" mode a concrete `provider:model` must be selected.
   * Rotation mode picks providers internally, so no model is required there.
   */
  private assertModelForMode(mode: ChatMode, model?: string): void {
    if (mode === CHAT_MODES.SPECIFIC && !model) {
      throw new ChatError('A model must be selected in "specific" mode.');
    }
  }

  private ensureConversation(conversationId: string, content: string): void {
    const existing = this.repo.getConversation(conversationId);
    if (!existing) {
      this.repo.createConversation({
        id: conversationId,
        title: deriveConversationTitle(content),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  private assertConversationExists(conversationId: string): void {
    if (!this.repo.getConversation(conversationId)) {
      throw new ConversationNotFoundError(conversationId);
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
    const history = this.repo.getMessages(conversationId);
    return [
      {
        role: 'system' as const,
        content: CHAT_SYSTEM_PROMPT,
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
