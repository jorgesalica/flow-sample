import { logger } from '@flows/core';
import {
    CHAT_STREAM_EVENT_TYPES,
    type ChatErrorResponse,
    type ChatStreamEvent,
} from '@flows/shared';
import { Elysia, t } from 'elysia';
import { ChatError, ConversationNotFoundError } from '../domain/errors';
import { createChatDatabase } from './database';
import {
    chatConversationSchema,
    chatDeleteResponseSchema,
    chatErrorResponseSchema,
    chatMessageSchema,
    chatProviderGroupSchema,
    chatRequestSchema,
    chatSendResponseSchema,
} from './schemas';
import { ChatService, type ChatApplication } from './services/chat.service';

const log = logger.child({ module: 'ChatRoutes' });
const CONVERSATION_NOT_FOUND = 'Conversation not found';
const PROVIDER_UNAVAILABLE = 'AI response is temporarily unavailable';

export function createChatRoutes(
    service: ChatApplication = new ChatService(createChatDatabase()),
) {
    return new Elysia({ prefix: '/api/chat' })
        .get('/models', () => service.getModelCatalog(), {
            response: { 200: t.Array(chatProviderGroupSchema) },
        })
        .get('/conversations', () => service.getConversations(), {
            response: { 200: t.Array(chatConversationSchema) },
        })
        .get(
            '/conversations/:id',
            ({ params, set }) => {
                try {
                    return service.getMessages(params.id);
                } catch (error) {
                    if (error instanceof ConversationNotFoundError) {
                        set.status = 404;
                        return { error: CONVERSATION_NOT_FOUND };
                    }
                    throw error;
                }
            },
            {
                params: t.Object({ id: t.String() }),
                response: {
                    200: t.Array(chatMessageSchema),
                    404: chatErrorResponseSchema,
                },
            },
        )
        .delete(
            '/conversations/:id',
            ({ params, set }) => {
                try {
                    service.deleteConversation(params.id);
                    return { success: true as const };
                } catch (error) {
                    if (error instanceof ConversationNotFoundError) {
                        set.status = 404;
                        return { error: CONVERSATION_NOT_FOUND };
                    }
                    throw error;
                }
            },
            {
                params: t.Object({ id: t.String() }),
                response: {
                    200: chatDeleteResponseSchema,
                    404: chatErrorResponseSchema,
                },
            },
        )
        .post(
            '/message',
            async ({ body, set }) => {
                try {
                    return await service.sendMessage(
                        body.conversationId,
                        body.message,
                        body.mode,
                        body.model,
                    );
                } catch (error) {
                    if (error instanceof ChatError) {
                        set.status = 400;
                        return { error: error.message };
                    }

                    logProviderFailure(error, body.conversationId, 'Chat message failed');
                    set.status = 503;
                    return { error: PROVIDER_UNAVAILABLE };
                }
            },
            {
                body: chatRequestSchema,
                response: {
                    200: chatSendResponseSchema,
                    400: chatErrorResponseSchema,
                    503: chatErrorResponseSchema,
                },
            },
        )
        .post(
            '/message/stream',
            ({ body, set }) => {
                let stream: AsyncGenerator<ChatStreamEvent>;
                try {
                    stream = service.sendMessageStream(
                        body.conversationId,
                        body.message,
                        body.mode,
                        body.model,
                    );
                } catch (error) {
                    if (error instanceof ChatError) {
                        set.status = 400;
                        return { error: error.message } satisfies ChatErrorResponse;
                    }

                    logProviderFailure(error, body.conversationId, 'Chat stream setup failed');
                    set.status = 503;
                    return { error: PROVIDER_UNAVAILABLE } satisfies ChatErrorResponse;
                }

                const encoder = new TextEncoder();
                const readable = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const event of stream) {
                                controller.enqueue(encodeSseEvent(encoder, event));
                            }
                        } catch (error) {
                            logProviderFailure(error, body.conversationId, 'Chat stream failed');
                            controller.enqueue(
                                encodeSseEvent(encoder, {
                                    type: CHAT_STREAM_EVENT_TYPES.ERROR,
                                    error: PROVIDER_UNAVAILABLE,
                                }),
                            );
                        } finally {
                            controller.close();
                        }
                    },
                });

                return new Response(readable, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        Connection: 'keep-alive',
                    },
                });
            },
            { body: chatRequestSchema },
        );
}

function encodeSseEvent(encoder: TextEncoder, event: ChatStreamEvent): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function logProviderFailure(error: unknown, conversationId: string, message: string): void {
    log.error(
        { conversationId, error: error instanceof Error ? error.message : String(error) },
        message,
    );
}
