import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { ChatDatabase } from '../../src/backend/database';

describe('ChatDatabase', () => {
    let sqlite: Database.Database;
    let repository: ChatDatabase;

    beforeEach(() => {
        sqlite = new Database(':memory:');
        repository = new ChatDatabase(sqlite);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        sqlite.close();
    });

    it('creates its schema and returns null for an absent conversation', () => {
        const tables = sqlite
            .prepare(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'chat_%' ORDER BY name",
            )
            .all() as Array<{ name: string }>;

        expect(tables.map((table) => table.name)).toEqual([
            'chat_conversations',
            'chat_messages',
        ]);
        expect(repository.getConversation('missing')).toBeNull();
    });

    it('creates, hydrates, and orders conversations by most recent activity', () => {
        repository.createConversation({ id: 'older', title: 'Older', createdAt: 1, updatedAt: 10 });
        repository.createConversation({ id: 'newer', title: 'Newer', createdAt: 2, updatedAt: 20 });

        expect(repository.getConversation('older')).toEqual({
            id: 'older',
            title: 'Older',
            createdAt: 1,
            updatedAt: 10,
        });
        expect(repository.getConversations().map((conversation) => conversation.id)).toEqual([
            'newer',
            'older',
        ]);
    });

    it('updates titles and activity timestamps', () => {
        vi.spyOn(Date, 'now').mockReturnValue(500);
        repository.createConversation({ id: 'conv-1', title: 'Old', createdAt: 1, updatedAt: 1 });

        repository.updateConversationTitle('conv-1', 'New');

        expect(repository.getConversation('conv-1')).toEqual({
            id: 'conv-1',
            title: 'New',
            createdAt: 1,
            updatedAt: 500,
        });
    });

    it('persists messages in chronological order and bumps conversation activity', () => {
        vi.spyOn(Date, 'now').mockReturnValue(700);
        repository.createConversation({ id: 'conv-1', title: 'Chat', createdAt: 1, updatedAt: 1 });
        repository.addMessage({
            id: 'm2',
            conversationId: 'conv-1',
            role: 'assistant',
            content: 'Second',
            modelUsed: 'model',
            providerUsed: 'provider',
            createdAt: 20,
        });
        repository.addMessage({
            id: 'm1',
            conversationId: 'conv-1',
            role: 'user',
            content: 'First',
            modelUsed: '',
            createdAt: 10,
        });

        expect(repository.getMessages('conv-1')).toEqual([
            {
                id: 'm1',
                conversationId: 'conv-1',
                role: 'user',
                content: 'First',
                modelUsed: '',
                providerUsed: '',
                createdAt: 10,
            },
            {
                id: 'm2',
                conversationId: 'conv-1',
                role: 'assistant',
                content: 'Second',
                modelUsed: 'model',
                providerUsed: 'provider',
                createdAt: 20,
            },
        ]);
        expect(repository.getConversation('conv-1')?.updatedAt).toBe(700);
    });

    it('deletes a conversation and cascades to its messages', () => {
        repository.createConversation({ id: 'conv-1', title: 'Chat', createdAt: 1, updatedAt: 1 });
        repository.addMessage({
            id: 'm1',
            conversationId: 'conv-1',
            role: 'user',
            content: 'Hello',
            modelUsed: '',
            createdAt: 2,
        });

        repository.deleteConversation('conv-1');

        expect(repository.getConversation('conv-1')).toBeNull();
        expect(repository.getMessages('conv-1')).toEqual([]);
    });
});
