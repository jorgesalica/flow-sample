import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { LLMResponse, LLMStreamEvent } from '@flows/core';
import type { ChatStreamEvent } from '@flows/shared';
import { ChatDatabase } from '../../../src/backend/database';
import { ChatError, ConversationNotFoundError } from '../../../src/domain/errors';

// ── Spies live in a hoisted block (vi.mock factories run before imports) ──
const spies = vi.hoisted(() => ({
    generateForProvider: vi.fn(),
    generateStreamForProvider: vi.fn(),
    getModelCatalogGrouped: vi.fn(),
    rotationGenerate: vi.fn(),
    rotationGenerateStream: vi.fn(),
    createRotation: vi.fn(),
}));

const {
    generateForProvider,
    generateStreamForProvider,
    getModelCatalogGrouped,
    rotationGenerate,
    rotationGenerateStream,
    createRotation,
} = spies;

// ── Mock the edge: @flows/core (LLMClient + logger) ───────────────────
// Replace the LLMClient facade and logger so no real provider/SDK is hit.
vi.mock('@flows/core', () => {
    const noop = () => {};
    const childLogger = { info: noop, warn: noop, error: noop, debug: noop };
    return {
        logger: { child: () => childLogger },
        LLMClient: {
            generateForProvider: spies.generateForProvider,
            generateStreamForProvider: spies.generateStreamForProvider,
            getModelCatalogGrouped: spies.getModelCatalogGrouped,
            createRotation: spies.createRotation,
        },
    };
});

const { ChatService } = await import('../../../src/backend/services/chat.service');
const testDb = new Database(':memory:');
const realChatDb = new ChatDatabase(testDb);

// ── Fixtures ──────────────────────────────────────────────────────────

function okResponse(overrides: Partial<LLMResponse> = {}): LLMResponse {
    return {
        content: 'Hi there, how can I help?',
        model: 'llama-3.3-70b',
        provider: 'groq',
        usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20 },
        latencyMs: 42,
        ...overrides,
    };
}

async function* toAsyncGen(events: LLMStreamEvent[]): AsyncGenerator<LLMStreamEvent> {
    for (const e of events) yield e;
}

function streamEvents(parts: string[], response: LLMResponse): LLMStreamEvent[] {
    return [
        ...parts.map((delta) => ({ delta, done: false })),
        { delta: '', done: true, response },
    ];
}

async function collect(gen: AsyncGenerator<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
    const out: ChatStreamEvent[] = [];
    for await (const event of gen) out.push(event);
    return out;
}

function lastDoneEvent(
    events: ChatStreamEvent[],
): Extract<ChatStreamEvent, { type: 'done' }> {
    const event = events.at(-1);
    if (!event || event.type !== 'done') {
        throw new Error('Expected a final done event');
    }
    return event;
}

const CONV_ID = 'conv-1';

describe('ChatService', () => {
    let service: InstanceType<typeof ChatService>;

    beforeEach(() => {
        testDb.exec('DELETE FROM chat_messages; DELETE FROM chat_conversations;');
        vi.clearAllMocks();
        // restore the default rotation client factory after clearAllMocks wipes impl
        createRotation.mockReturnValue({
            generate: rotationGenerate,
            generateStream: rotationGenerateStream,
        });
        service = new ChatService(realChatDb);
    });

    afterAll(() => {
        testDb.close();
    });

    // ── getModelCatalog ───────────────────────────────────────────────
    describe('getModelCatalog', () => {
        it('maps grouped catalogs into ChatProviderGroup shape', () => {
            getModelCatalogGrouped.mockReturnValue([
                {
                    provider: 'groq',
                    models: [
                        {
                            id: 'groq:llama-3.3-70b',
                            name: 'Llama 3.3 70B',
                            tier: 'high',
                            pricing: 'free',
                            contextWindow: 128_000,
                            description: 'fast',
                        },
                    ],
                },
            ]);

            const groups = service.getModelCatalog();

            expect(groups).toHaveLength(1);
            expect(groups[0].provider).toBe('groq');
            expect(groups[0].models[0]).toEqual({
                id: 'groq:llama-3.3-70b',
                name: 'Llama 3.3 70B',
                tier: 'high',
                pricing: 'free',
                contextWindow: 128_000,
                description: 'fast',
            });
        });

        it('returns an empty array when no providers are configured', () => {
            getModelCatalogGrouped.mockReturnValue([]);
            expect(service.getModelCatalog()).toEqual([]);
        });
    });

    // ── conversation passthroughs ─────────────────────────────────────
    describe('conversation reads/deletes', () => {
        it('getConversations returns persisted conversations', () => {
            realChatDb.createConversation({
                id: CONV_ID,
                title: 'Greeting',
                createdAt: 1,
                updatedAt: 1,
            });
            const list = service.getConversations();
            expect(list).toHaveLength(1);
            expect(list[0].id).toBe(CONV_ID);
        });

        it('getMessages returns ordered messages for a conversation', () => {
            realChatDb.createConversation({ id: CONV_ID, title: 't', createdAt: 1, updatedAt: 1 });
            realChatDb.addMessage({
                id: 'm1',
                conversationId: CONV_ID,
                role: 'user',
                content: 'first',
                modelUsed: '',
                createdAt: 1,
            });
            realChatDb.addMessage({
                id: 'm2',
                conversationId: CONV_ID,
                role: 'assistant',
                content: 'second',
                modelUsed: 'groq:llama',
                providerUsed: 'groq',
                createdAt: 2,
            });

            const msgs = service.getMessages(CONV_ID);
            expect(msgs.map((m) => m.content)).toEqual(['first', 'second']);
        });

        it('getMessages rejects an unknown conversation', () => {
            expect(() => service.getMessages('missing')).toThrow(ConversationNotFoundError);
        });

        it('deleteConversation removes the conversation', () => {
            realChatDb.createConversation({ id: CONV_ID, title: 't', createdAt: 1, updatedAt: 1 });
            service.deleteConversation(CONV_ID);
            expect(service.getConversations()).toEqual([]);
        });

        it('deleteConversation rejects an unknown conversation', () => {
            expect(() => service.deleteConversation('missing')).toThrow(
                ConversationNotFoundError,
            );
        });
    });

    // ── sendMessage (non-streaming) ───────────────────────────────────
    describe('sendMessage', () => {
        it('creates the conversation when it does not exist yet', async () => {
            generateForProvider.mockResolvedValue(okResponse());

            await service.sendMessage(CONV_ID, 'Hello world', 'specific', 'groq:llama-3.3-70b');

            const convs = service.getConversations();
            expect(convs).toHaveLength(1);
            expect(convs[0].id).toBe(CONV_ID);
        });

        it('derives the conversation title from the first message (truncated past 30 chars)', async () => {
            generateForProvider.mockResolvedValue(okResponse());
            const longContent = 'a'.repeat(50);

            await service.sendMessage(CONV_ID, longContent, 'specific', 'groq:llama');

            const title = service.getConversations()[0].title;
            expect(title).toBe('a'.repeat(30) + '...');
        });

        it('does not append ellipsis for short titles', async () => {
            generateForProvider.mockResolvedValue(okResponse());
            await service.sendMessage(CONV_ID, 'short', 'specific', 'groq:llama');
            expect(service.getConversations()[0].title).toBe('short');
        });

        it('persists both the user and assistant messages', async () => {
            generateForProvider.mockResolvedValue(okResponse({ content: 'Sure!' }));

            const { userMessage, assistantMessage } = await service.sendMessage(
                CONV_ID,
                'Hi',
                'specific',
                'groq:llama-3.3-70b',
            );

            expect(userMessage.role).toBe('user');
            expect(userMessage.content).toBe('Hi');
            expect(assistantMessage.role).toBe('assistant');
            expect(assistantMessage.content).toBe('Sure!');

            const stored = service.getMessages(CONV_ID);
            expect(stored).toHaveLength(2);
            expect(stored.map((m) => m.role)).toEqual(['user', 'assistant']);
        });

        it('records the model and provider that actually answered', async () => {
            generateForProvider.mockResolvedValue(
                okResponse({ provider: 'cerebras', model: 'qwen-3-32b' }),
            );

            const { assistantMessage } = await service.sendMessage(
                CONV_ID,
                'Hi',
                'specific',
                'cerebras:qwen-3-32b',
            );

            expect(assistantMessage.providerUsed).toBe('cerebras');
            expect(assistantMessage.modelUsed).toBe('qwen-3-32b');
        });

        it('uses generateForProvider with the given model in specific mode', async () => {
            generateForProvider.mockResolvedValue(okResponse());

            await service.sendMessage(CONV_ID, 'Hi', 'specific', 'groq:llama-3.3-70b');

            expect(generateForProvider).toHaveBeenCalledOnce();
            expect(generateForProvider.mock.calls[0][0]).toBe('groq:llama-3.3-70b');
            expect(rotationGenerate).not.toHaveBeenCalled();
        });

        it('builds the request with a system prompt followed by history', async () => {
            generateForProvider.mockResolvedValue(okResponse());

            await service.sendMessage(CONV_ID, 'What is 2+2?', 'specific', 'groq:llama');

            const req = generateForProvider.mock.calls[0][1];
            expect(req.messages[0].role).toBe('system');
            expect(req.messages[0].content).toMatch(/Markdown/);
            // The just-saved user message is included as the last turn.
            const last = req.messages[req.messages.length - 1];
            expect(last.role).toBe('user');
            expect(last.content).toBe('What is 2+2?');
        });

        it('maps prior assistant turns back to the assistant role in the request', async () => {
            realChatDb.createConversation({ id: CONV_ID, title: 't', createdAt: 1, updatedAt: 1 });
            realChatDb.addMessage({
                id: 'm1',
                conversationId: CONV_ID,
                role: 'assistant',
                content: 'earlier reply',
                modelUsed: 'groq:llama',
                providerUsed: 'groq',
                createdAt: 1,
            });
            generateForProvider.mockResolvedValue(okResponse());

            await service.sendMessage(CONV_ID, 'follow up', 'specific', 'groq:llama');

            const req = generateForProvider.mock.calls[0][1];
            const roles = req.messages.map((m) => m.role);
            expect(roles).toEqual(['system', 'assistant', 'user']);
            expect(req.messages[1].content).toBe('earlier reply');
        });

        it('uses the rotation client in rotation mode (ignores model)', async () => {
            rotationGenerate.mockResolvedValue(okResponse({ provider: 'openrouter' }));

            const { assistantMessage } = await service.sendMessage(CONV_ID, 'Hi', 'rotation');

            expect(rotationGenerate).toHaveBeenCalledOnce();
            expect(generateForProvider).not.toHaveBeenCalled();
            expect(assistantMessage.providerUsed).toBe('openrouter');
        });

        it('creates the rotation client lazily and reuses it across calls', async () => {
            rotationGenerate.mockResolvedValue(okResponse());

            await service.sendMessage(CONV_ID, 'one', 'rotation');
            await service.sendMessage(CONV_ID, 'two', 'rotation');

            expect(createRotation).toHaveBeenCalledOnce();
            expect(rotationGenerate).toHaveBeenCalledTimes(2);
        });

        it('defaults to specific mode when mode is omitted', async () => {
            generateForProvider.mockResolvedValue(okResponse());

            await service.sendMessage(CONV_ID, 'Hi', undefined, 'groq:llama');

            expect(generateForProvider).toHaveBeenCalledOnce();
            expect(rotationGenerate).not.toHaveBeenCalled();
        });

        it('grows the request history as the conversation continues', async () => {
            generateForProvider.mockResolvedValue(okResponse());

            await service.sendMessage(CONV_ID, 'first', 'specific', 'groq:llama');
            await service.sendMessage(CONV_ID, 'second', 'specific', 'groq:llama');

            // 2nd call: system + (user1, assistant1) + user2 = 4 messages
            const secondReq = generateForProvider.mock.calls[1][1];
            expect(secondReq.messages).toHaveLength(4);
            expect(secondReq.messages.map((m) => m.role)).toEqual([
                'system',
                'user',
                'assistant',
                'user',
            ]);
        });

        it('propagates errors and does not persist an assistant message on failure', async () => {
            generateForProvider.mockRejectedValue(new Error('provider exploded'));

            await expect(
                service.sendMessage(CONV_ID, 'Hi', 'specific', 'groq:llama'),
            ).rejects.toThrow('provider exploded');

            // user message was saved before the call; assistant was never reached.
            const stored = service.getMessages(CONV_ID);
            expect(stored).toHaveLength(1);
            expect(stored[0].role).toBe('user');
            expect(stored.find((m) => m.role === 'assistant')).toBeUndefined();
        });
    });

    // ── model validation (specific mode) ──────────────────────────────
    describe('specific-mode model validation', () => {
        it('sendMessage throws ChatError when no model is given in specific mode', async () => {
            await expect(service.sendMessage(CONV_ID, 'Hi', 'specific')).rejects.toBeInstanceOf(
                ChatError,
            );
            expect(generateForProvider).not.toHaveBeenCalled();
        });

        it('sendMessage persists nothing when the model is missing', async () => {
            await expect(service.sendMessage(CONV_ID, 'Hi', 'specific')).rejects.toThrow();
            expect(service.getConversations()).toEqual([]);
            expect(realChatDb.getMessages(CONV_ID)).toEqual([]);
        });

        it('sendMessageStream throws ChatError when no model is given in specific mode', () => {
            expect(() => service.sendMessageStream(CONV_ID, 'Hi', 'specific')).toThrow(ChatError);
            expect(generateStreamForProvider).not.toHaveBeenCalled();
        });

        it('rotation mode does not require a model', async () => {
            rotationGenerate.mockResolvedValue(okResponse());
            await expect(service.sendMessage(CONV_ID, 'Hi', 'rotation')).resolves.toBeDefined();
        });
    });

    // ── sendMessageStream ─────────────────────────────────────────────
    describe('sendMessageStream', () => {
        it('emits user_message, deltas, then done with the saved assistant message', async () => {
            const resp = okResponse({ provider: 'groq', model: 'llama-3.3-70b' });
            generateStreamForProvider.mockReturnValue(
                toAsyncGen(streamEvents(['Hel', 'lo!'], resp)),
            );

            const events = await collect(
                service.sendMessageStream(CONV_ID, 'Hi', 'specific', 'groq:llama-3.3-70b'),
            );

            expect(events).toMatchObject([
                { type: 'user_message' },
                { type: 'delta', delta: 'Hel' },
                { type: 'delta', delta: 'lo!' },
                { type: 'done' },
            ]);

            const done = lastDoneEvent(events).message;
            expect(done.role).toBe('assistant');
            expect(done.content).toBe('Hello!');
            expect(done.providerUsed).toBe('groq');
            expect(done.modelUsed).toBe('llama-3.3-70b');
        });

        it('aggregates deltas into the persisted assistant message content', async () => {
            generateStreamForProvider.mockReturnValue(
                toAsyncGen(streamEvents(['a', 'b', 'c'], okResponse())),
            );

            await collect(service.sendMessageStream(CONV_ID, 'Hi', 'specific', 'groq:llama'));

            const stored = service.getMessages(CONV_ID);
            const assistant = stored.find((m) => m.role === 'assistant');
            expect(assistant?.content).toBe('abc');
        });

        it('uses the rotation client stream in rotation mode', async () => {
            rotationGenerateStream.mockReturnValue(
                toAsyncGen(streamEvents(['ok'], okResponse({ provider: 'mistral' }))),
            );

            const events = await collect(service.sendMessageStream(CONV_ID, 'Hi', 'rotation'));
            const done = lastDoneEvent(events).message;

            expect(rotationGenerateStream).toHaveBeenCalledOnce();
            expect(generateStreamForProvider).not.toHaveBeenCalled();
            expect(done.providerUsed).toBe('mistral');
        });

        it('saves the user message before streaming begins', async () => {
            generateStreamForProvider.mockReturnValue(
                toAsyncGen(streamEvents(['hi'], okResponse())),
            );

            const gen = service.sendMessageStream(CONV_ID, 'Hi', 'specific', 'groq:llama');
            const first = await gen.next();

            // The very first event carries the persisted user message.
            expect(first.value).toMatchObject({ type: 'user_message' });
            const stored = service.getMessages(CONV_ID);
            expect(stored.some((m) => m.role === 'user' && m.content === 'Hi')).toBe(true);

            // drain the rest so the generator completes cleanly
            await collect(gen);
        });

        it('produces empty assistant content when the stream yields no deltas', async () => {
            generateStreamForProvider.mockReturnValue(
                toAsyncGen([{ delta: '', done: true, response: okResponse() }]),
            );

            const events = await collect(
                service.sendMessageStream(CONV_ID, 'Hi', 'specific', 'groq:llama'),
            );
            const done = lastDoneEvent(events).message;
            expect(done.content).toBe('');

            const assistant = service.getMessages(CONV_ID).find((m) => m.role === 'assistant');
            expect(assistant?.content).toBe('');
        });

        it('builds the streaming request with system prompt + history', async () => {
            generateStreamForProvider.mockReturnValue(
                toAsyncGen(streamEvents(['x'], okResponse())),
            );

            await collect(service.sendMessageStream(CONV_ID, 'stream me', 'specific', 'groq:llama'));

            const req = generateStreamForProvider.mock.calls[0][1];
            expect(req.messages[0].role).toBe('system');
            expect(req.messages[req.messages.length - 1].content).toBe('stream me');
        });

        it('ignores a done event that carries no response (no provider/model recorded)', async () => {
            generateStreamForProvider.mockReturnValue(
                toAsyncGen([
                    { delta: 'partial', done: false },
                    { delta: '', done: true },
                ]),
            );

            const events = await collect(
                service.sendMessageStream(CONV_ID, 'Hi', 'specific', 'groq:llama'),
            );
            const done = lastDoneEvent(events).message;
            expect(done.content).toBe('partial');
            expect(done.providerUsed).toBe('');
            expect(done.modelUsed).toBe('');
        });
    });
});
