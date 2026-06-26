import type { ChatConversation, ChatMessage } from '@flows/shared';

/**
 * Port for persisting chat conversations and messages.
 *
 * Describes the contract the concrete `ChatDatabase` repository fulfills, so
 * the service depends on this interface rather than the concrete class.
 */
export interface ChatRepository {
    // --- Conversations ---
    createConversation(conversation: ChatConversation): void;
    updateConversationTitle(id: string, title: string): void;
    updateConversationTimestamp(id: string): void;
    getConversations(): ChatConversation[];
    deleteConversation(id: string): void;

    // --- Messages ---
    addMessage(message: ChatMessage): void;
    getMessages(conversationId: string): ChatMessage[];
}
