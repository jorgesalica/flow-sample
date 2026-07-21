import { CHAT_MODES } from '@flows/shared';

/**
 * Chat flow configuration & constants.
 *
 * Centralizes the values that were previously inlined in the service, matching
 * the convention used by the other flows (e.g. trading's `config.ts`).
 */

/**
 * System prompt prepended to every conversation before the message history.
 *
 * Keeps replies in Markdown and avoids a leading heading, which renders poorly
 * in the chat bubble.
 */
export const CHAT_SYSTEM_PROMPT =
    'You are a helpful AI assistant. Format your replies using standard Markdown. ' +
    'Never start your reply with a heading (# or ## or ###). Begin with normal text.';

/** Mode used when the caller does not specify one. */
export const DEFAULT_CHAT_MODE = CHAT_MODES.SPECIFIC;
