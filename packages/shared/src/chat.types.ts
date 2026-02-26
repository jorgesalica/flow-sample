/**
 * Chat Flow Domain Types
 */

export interface ChatConversation {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    modelUsed: string;
    createdAt: number;
}

export interface ChatProviderOption {
    id: string;
    name: string;
    provider: string;
}

export interface ChatRequest {
    conversationId: string;
    message: string;
    model: string;
}
