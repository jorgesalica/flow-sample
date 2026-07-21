import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    ChatConversation,
    ChatMessage,
    ChatProviderGroup,
    ChatStreamEvent,
} from '@flows/shared';
import { ChatError, ConversationNotFoundError } from '../../src/domain/errors';
import type { ChatApplication } from '../../src/backend/services/chat.service';

const logError = vi.hoisted(() => vi.fn());

vi.mock('@flows/core', () => ({
    logger: {
        child: () => ({ info: vi.fn(), warn: vi.fn(), error: logError, debug: vi.fn() }),
    },
    LLMClient: {},
}));

const { createChatRoutes } = await import('../../src/backend/routes');

const conversation: ChatConversation = {
    id: 'conv-1',
    title: 'Test chat',
    createdAt: 1,
    updatedAt: 2,
};

const userMessage: ChatMessage = {
    id: 'm1',
    conversationId: conversation.id,
    role: 'user',
    content: 'Hello',
    modelUsed: '',
    createdAt: 3,
};

const assistantMessage: ChatMessage = {
    id: 'm2',
    conversationId: conversation.id,
    role: 'assistant',
    content: 'Hi',
    modelUsed: 'model',
    providerUsed: 'provider',
    createdAt: 4,
};

const catalog: ChatProviderGroup[] = [
    {
        provider: 'provider',
        models: [
            {
                id: 'model',
                name: 'Model',
                tier: 'high',
                pricing: 'free',
                contextWindow: 8192,
            },
        ],
    },
];

const service = {
    getModelCatalog: vi.fn<ChatApplication['getModelCatalog']>(),
    getConversations: vi.fn<ChatApplication['getConversations']>(),
    deleteConversation: vi.fn<ChatApplication['deleteConversation']>(),
    getMessages: vi.fn<ChatApplication['getMessages']>(),
    sendMessage: vi.fn<ChatApplication['sendMessage']>(),
    sendMessageStream: vi.fn<ChatApplication['sendMessageStream']>(),
};

function request(path: string, init?: RequestInit): Promise<Response> {
    return createChatRoutes(service).handle(new Request(`http://localhost${path}`, init));
}

function post(path: string, body: Record<string, unknown>): Promise<Response> {
    return request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function* streamEvents(events: ChatStreamEvent[]): AsyncGenerator<ChatStreamEvent> {
    for (const event of events) {
        yield event;
    }
}

async function* failingStream(): AsyncGenerator<ChatStreamEvent> {
    throw new Error('[mistral] secret provider response');
}

function parseSse(text: string): Array<Record<string, unknown>> {
    return text
        .trim()
        .split('\n\n')
        .map((line) => JSON.parse(line.replace(/^data: /, '')) as Record<string, unknown>);
}

describe('Chat routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        service.getModelCatalog.mockReturnValue(catalog);
        service.getConversations.mockReturnValue([conversation]);
        service.getMessages.mockReturnValue([userMessage, assistantMessage]);
        service.sendMessage.mockResolvedValue({ userMessage, assistantMessage });
        service.sendMessageStream.mockReturnValue(
            streamEvents([
                { type: 'user_message', message: userMessage },
                { type: 'delta', delta: 'Hi' },
                { type: 'done', message: assistantMessage },
            ]),
        );
    });

    it('returns the typed model catalog and conversations', async () => {
        const modelsResponse = await request('/api/chat/models');
        const conversationsResponse = await request('/api/chat/conversations');

        expect(modelsResponse.status).toBe(200);
        await expect(modelsResponse.json()).resolves.toEqual(catalog);
        expect(conversationsResponse.status).toBe(200);
        await expect(conversationsResponse.json()).resolves.toEqual([conversation]);
    });

    it('maps missing conversation reads to a stable 404', async () => {
        service.getMessages.mockImplementation(() => {
            throw new ConversationNotFoundError('missing');
        });

        const response = await request('/api/chat/conversations/missing');

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({ error: 'Conversation not found' });
    });

    it('maps missing conversation deletes to a stable 404', async () => {
        service.deleteConversation.mockImplementation(() => {
            throw new ConversationNotFoundError('missing');
        });

        const response = await request('/api/chat/conversations/missing', { method: 'DELETE' });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({ error: 'Conversation not found' });
    });

    it('returns a successful non-streaming response', async () => {
        const response = await post('/api/chat/message', {
            conversationId: conversation.id,
            message: 'Hello',
            mode: 'specific',
            model: 'provider:model',
        });

        expect(response.status).toBe(200);
        expect(service.sendMessage).toHaveBeenCalledWith(
            conversation.id,
            'Hello',
            'specific',
            'provider:model',
        );
        await expect(response.json()).resolves.toEqual({ userMessage, assistantMessage });
    });

    it('maps domain validation errors to 400', async () => {
        service.sendMessage.mockRejectedValue(new ChatError('A model must be selected.'));

        const response = await post('/api/chat/message', {
            conversationId: conversation.id,
            message: 'Hello',
            mode: 'specific',
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: 'A model must be selected.' });
    });

    it('sanitizes non-streaming provider failures and logs details server-side', async () => {
        service.sendMessage.mockRejectedValue(
            new Error('[mistral] API error 400: secret provider response'),
        );

        const response = await post('/api/chat/message', {
            conversationId: conversation.id,
            message: 'Hello',
            mode: 'rotation',
        });

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: 'AI response is temporarily unavailable',
        });
        expect(logError).toHaveBeenCalledWith(
            expect.objectContaining({
                conversationId: conversation.id,
                error: expect.stringContaining('secret provider response'),
            }),
            'Chat message failed',
        );
    });

    it('serializes typed stream events as SSE', async () => {
        const response = await post('/api/chat/message/stream', {
            conversationId: conversation.id,
            message: 'Hello',
            mode: 'rotation',
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
        expect(parseSse(await response.text())).toMatchObject([
            { type: 'user_message', message: userMessage },
            { type: 'delta', delta: 'Hi' },
            { type: 'done', message: assistantMessage },
        ]);
    });

    it('sanitizes provider failures inside an established SSE response', async () => {
        service.sendMessageStream.mockReturnValue(failingStream());

        const response = await post('/api/chat/message/stream', {
            conversationId: conversation.id,
            message: 'Hello',
            mode: 'rotation',
        });
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(parseSse(body)).toEqual([
            { type: 'error', error: 'AI response is temporarily unavailable' },
        ]);
        expect(body).not.toContain('secret provider response');
        expect(logError).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('secret provider response') }),
            'Chat stream failed',
        );
    });

    it('rejects an invalid stream request before opening SSE', async () => {
        service.sendMessageStream.mockImplementation(() => {
            throw new ChatError('A model must be selected.');
        });

        const response = await post('/api/chat/message/stream', {
            conversationId: conversation.id,
            message: 'Hello',
            mode: 'specific',
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: 'A model must be selected.' });
    });
});
