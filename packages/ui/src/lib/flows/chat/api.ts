import { api } from '@lib/client';
import type { ChatConversation, ChatMessage, ChatProviderOption } from '@flows/shared';

// Typed Eden client for the chat routes
const chatApi = api.chat;

/**
 * Extracts a readable error message from Eden's error object
 */
function extractError(error: unknown): Error {
    if (!error) return new Error('Unknown API Error');

    // Convert to a generic object to safely check properties
    const errObj = error as Record<string, unknown>;

    const valueObj = errObj?.value as Record<string, unknown> | undefined;

    const msg =
        (valueObj?.error as string) ||
        (valueObj?.message as string) ||
        (typeof errObj?.value === 'string' ? errObj.value : undefined) ||
        (errObj?.message as string) ||
        JSON.stringify(error);

    return new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
}

export async function fetchModels(): Promise<ChatProviderOption[]> {
    const { data, error } = await chatApi.models.get();
    if (error) throw extractError(error);
    return data as ChatProviderOption[];
}

export async function fetchConversations(): Promise<ChatConversation[]> {
    const { data, error } = await chatApi.conversations.get();
    if (error) throw extractError(error);
    return data as ChatConversation[];
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await chatApi.conversations({ id: conversationId }).get();
    if (error) throw extractError(error);
    return data as ChatMessage[];
}

export async function deleteConversation(conversationId: string): Promise<void> {
    const { error } = await chatApi.conversations({ id: conversationId }).delete();
    if (error) throw extractError(error);
}

export async function sendMessage(conversationId: string, message: string, model?: string): Promise<{ userMessage: ChatMessage, assistantMessage: ChatMessage }> {
    const { data, error } = await chatApi.message.post({
        conversationId,
        message,
        model
    });
    if (error) throw extractError(error);
    return data as { userMessage: ChatMessage, assistantMessage: ChatMessage };
}
