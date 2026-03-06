import { Elysia, t } from 'elysia';
import { ChatService } from './services/chat.service';

const chatService = new ChatService();

/**
 * Chat Flow API Routes
 */
export const chatRoutes = new Elysia({ prefix: '/chat' })
    // Model catalog (grouped by provider)
    .get('/models', () => {
        return chatService.getModelCatalog();
    })

    // Conversation Management
    .get('/conversations', () => {
        return chatService.getConversations();
    })
    .get(
        '/conversations/:id',
        ({ params }) => {
            return chatService.getMessages(params.id);
        },
        {
            params: t.Object({
                id: t.String(),
            }),
        },
    )
    .delete(
        '/conversations/:id',
        ({ params }) => {
            chatService.deleteConversation(params.id);
            return { success: true };
        },
        {
            params: t.Object({
                id: t.String(),
            }),
        },
    )

    // Non-streaming message (fallback)
    .post(
        '/message',
        async ({ body }) => {
            return await chatService.sendMessage(
                body.conversationId,
                body.message,
                body.mode,
                body.model,
            );
        },
        {
            body: t.Object({
                conversationId: t.String(),
                message: t.String(),
                mode: t.Optional(t.Union([t.Literal('rotation'), t.Literal('specific')])),
                model: t.Optional(t.String()),
            }),
        },
    )

    // Streaming message (SSE)
    .post(
        '/message/stream',
        async ({ body }) => {
            const stream = chatService.sendMessageStream(
                body.conversationId,
                body.message,
                body.mode,
                body.model,
            );

            const readable = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of stream) {
                            controller.enqueue(new TextEncoder().encode(chunk));
                        }
                    } catch (error) {
                        const errMsg = error instanceof Error ? error.message : String(error);
                        controller.enqueue(
                            new TextEncoder().encode(
                                `data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`,
                            ),
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
        {
            body: t.Object({
                conversationId: t.String(),
                message: t.String(),
                mode: t.Optional(t.Union([t.Literal('rotation'), t.Literal('specific')])),
                model: t.Optional(t.String()),
            }),
        },
    );
