// @flows/chat — Chat Flow Package

// Backend exports
export { chatRoutes } from './backend/routes';
export { ChatService } from './backend/services/chat.service';
export { ChatDatabase, chatDb } from './backend/database';

// Domain exports
export type { ChatRepository } from './domain/ports';
export { deriveConversationTitle, MAX_TITLE_LENGTH } from './domain/conversation';
export { FlowError, ChatError, ConversationNotFoundError } from './domain/errors';
