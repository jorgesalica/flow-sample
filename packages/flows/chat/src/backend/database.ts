import type Database from 'better-sqlite3';
import { createDatabase } from '@flows/core';
import type { ChatConversation, ChatMessage } from '@flows/shared';

/**
 * Chat Database Schema & Queries
 */
export class ChatDatabase {
    private db: Database.Database;

    constructor(sharedDb: Database.Database) {
        this.db = sharedDb;
        this.init();
    }

    private init() {
        // Create tables locally for the chat flow
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS chat_conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                model_used TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at DESC);
        `);
    }

    // --- Conversations ---

    createConversation(conversation: ChatConversation): void {
        const stmt = this.db.prepare(`
            INSERT INTO chat_conversations (id, title, created_at, updated_at)
            VALUES (@id, @title, @createdAt, @updatedAt)
        `);
        stmt.run(conversation);
    }

    updateConversationTitle(id: string, title: string): void {
        const stmt = this.db.prepare(`
            UPDATE chat_conversations SET title = ?, updated_at = ? WHERE id = ?
        `);
        stmt.run(title, Date.now(), id);
    }

    updateConversationTimestamp(id: string): void {
        const stmt = this.db.prepare(`
            UPDATE chat_conversations SET updated_at = ? WHERE id = ?
        `);
        stmt.run(Date.now(), id);
    }

    getConversations(): ChatConversation[] {
        const stmt = this.db.prepare(`
            SELECT id, title, created_at as createdAt, updated_at as updatedAt 
            FROM chat_conversations 
            ORDER BY updated_at DESC
        `);
        return stmt.all() as ChatConversation[];
    }

    deleteConversation(id: string): void {
        const stmt = this.db.prepare(`DELETE FROM chat_conversations WHERE id = ?`);
        stmt.run(id);
    }

    // --- Messages ---

    addMessage(message: ChatMessage): void {
        const stmt = this.db.prepare(`
            INSERT INTO chat_messages (id, conversation_id, role, content, model_used, created_at)
            VALUES (@id, @conversationId, @role, @content, @modelUsed, @createdAt)
        `);
        stmt.run({
            id: message.id,
            conversationId: message.conversationId,
            role: message.role,
            content: message.content,
            modelUsed: message.modelUsed,
            createdAt: message.createdAt
        });

        // Bump conversation updated_at
        this.updateConversationTimestamp(message.conversationId);
    }

    getMessages(conversationId: string): ChatMessage[] {
        const stmt = this.db.prepare(`
            SELECT 
                id, 
                conversation_id as conversationId, 
                role, 
                content, 
                model_used as modelUsed, 
                created_at as createdAt 
            FROM chat_messages 
            WHERE conversation_id = ? 
            ORDER BY created_at ASC
        `);
        return stmt.all(conversationId) as ChatMessage[];
    }
}

// Export a singleton instance using the core database
export const chatDb = new ChatDatabase(createDatabase('chat.db'));
