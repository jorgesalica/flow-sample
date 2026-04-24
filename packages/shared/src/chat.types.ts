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
    providerUsed?: string;
    createdAt: number;
}

// ── Model selector types ─────────────────────────────────────────────

export interface ChatProviderOption {
    id: string;
    name: string;
    provider: string;
}

export interface ChatModelCatalogEntry {
    id: string;
    name: string;
    tier: string;
    pricing: string;
    contextWindow: number;
    description?: string;
}

export interface ChatProviderGroup {
    provider: string;
    models: ChatModelCatalogEntry[];
}

export type ChatMode = 'rotation' | 'specific';

export interface ChatRequest {
    conversationId: string;
    message: string;
    model?: string;
    mode?: ChatMode;
}
