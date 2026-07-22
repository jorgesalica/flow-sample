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

export const CHAT_MODES = {
  ROTATION: 'rotation',
  SPECIFIC: 'specific',
} as const;

export type ChatMode = (typeof CHAT_MODES)[keyof typeof CHAT_MODES];

export interface ChatRequest {
  conversationId: string;
  message: string;
  model?: string;
  mode?: ChatMode;
}

export interface ChatSendResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface ChatDeleteResponse {
  success: true;
}

export interface ChatErrorResponse {
  error: string;
}

export const CHAT_STREAM_EVENT_TYPES = {
  USER_MESSAGE: 'user_message',
  DELTA: 'delta',
  DONE: 'done',
  ERROR: 'error',
} as const;

export type ChatStreamEvent =
  | { type: typeof CHAT_STREAM_EVENT_TYPES.USER_MESSAGE; message: ChatMessage }
  | { type: typeof CHAT_STREAM_EVENT_TYPES.DELTA; delta: string }
  | { type: typeof CHAT_STREAM_EVENT_TYPES.DONE; message: ChatMessage }
  | { type: typeof CHAT_STREAM_EVENT_TYPES.ERROR; error: string };
