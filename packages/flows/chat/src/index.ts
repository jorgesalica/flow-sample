// @flows/chat — Chat Flow Package

// Backend exports
export { createChatRoutes } from './backend/routes';
export { ChatService, type ChatApplication } from './backend/services/chat.service';
export { ChatDatabase, createChatDatabase } from './backend/database';
export * from './backend/schemas';

// Domain exports
export type { ChatRepository } from './domain/ports';
export { deriveConversationTitle, MAX_TITLE_LENGTH } from './domain/conversation';
export { FlowError, ChatError, ConversationNotFoundError } from './domain/errors';
