import { describe, it, expect } from 'vitest';
import { FlowError, ChatError, ConversationNotFoundError } from '../../src/domain/errors';

describe('chat domain errors', () => {
    it('FlowError carries its message and name', () => {
        const e = new FlowError('boom');
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe('boom');
        expect(e.name).toBe('FlowError');
    });

    it('ChatError defaults its message and extends FlowError', () => {
        const e = new ChatError();
        expect(e).toBeInstanceOf(FlowError);
        expect(e.message).toBe('Chat operation failed');
        expect(e.name).toBe('ChatError');
    });

    it('ChatError accepts a custom message', () => {
        expect(new ChatError('no model selected').message).toBe('no model selected');
    });

    it('ConversationNotFoundError embeds the conversation id', () => {
        const e = new ConversationNotFoundError('conv-42');
        expect(e).toBeInstanceOf(FlowError);
        expect(e.conversationId).toBe('conv-42');
        expect(e.message).toBe('Conversation not found: conv-42');
        expect(e.name).toBe('ConversationNotFoundError');
    });
});
