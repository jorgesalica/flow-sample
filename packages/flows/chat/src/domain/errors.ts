/**
 * Base error for all flow errors
 */
export class FlowError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FlowError';
    }
}

/**
 * Generic chat flow error
 */
export class ChatError extends FlowError {
    constructor(message: string = 'Chat operation failed') {
        super(message);
        this.name = 'ChatError';
    }
}

/**
 * A conversation could not be found
 */
export class ConversationNotFoundError extends FlowError {
    constructor(public conversationId: string) {
        super(`Conversation not found: ${conversationId}`);
        this.name = 'ConversationNotFoundError';
    }
}
