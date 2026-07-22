/** Maximum length of a derived conversation title before it is truncated. */
export const MAX_TITLE_LENGTH = 30;

/**
 * Derive a conversation title from its first message.
 *
 * Pure transform: the title is the message truncated to {@link MAX_TITLE_LENGTH}
 * characters, with an ellipsis appended when the message was longer.
 */
export function deriveConversationTitle(firstMessage: string): string {
  return (
    firstMessage.slice(0, MAX_TITLE_LENGTH) + (firstMessage.length > MAX_TITLE_LENGTH ? '...' : '')
  );
}
