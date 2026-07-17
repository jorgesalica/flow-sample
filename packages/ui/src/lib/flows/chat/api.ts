import { api, type ApiClient } from '@lib/client';
import type { ChatConversation, ChatMessage, ChatProviderGroup, ChatMode } from '@flows/shared';

// Typed Eden client for the chat routes (mounted under /api/chat, like every flow)
const chatApi = api.api.chat;

/**
 * Relative URL for the SSE streaming endpoint.
 *
 * Eden Treaty doesn't model SSE responses, so the stream is consumed with a
 * hand-rolled `fetch`. A relative path keeps it same-origin: in dev it's
 * forwarded by the Vite proxy (`/api` → backend), in prod it hits the backend
 * that serves the UI — no hardcoded host/port.
 */
const STREAM_URL = '/api/chat/message/stream';

/**
 * Extracts a readable error message from Eden's error object
 */
function extractError(error: unknown): Error {
  if (!error) return new Error('Unknown API Error');

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

export async function fetchModelCatalog(client: ApiClient = api): Promise<ChatProviderGroup[]> {
  const { data, error } = await client.api.chat.models.get();
  if (error) throw extractError(error);
  return data as ChatProviderGroup[];
}

export async function fetchConversations(client: ApiClient = api): Promise<ChatConversation[]> {
  const { data, error } = await client.api.chat.conversations.get();
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

/** Non-streaming message send (fallback). */
export async function sendMessage(
  conversationId: string,
  message: string,
  mode: ChatMode,
  model?: string
): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  const { data, error } = await chatApi.message.post({
    conversationId,
    message,
    mode,
    model,
  });
  if (error) throw extractError(error);
  return data as { userMessage: ChatMessage; assistantMessage: ChatMessage };
}

/** SSE event types from the backend. */
export type StreamEvent =
  | { type: 'user_message'; message: ChatMessage }
  | { type: 'delta'; delta: string }
  | { type: 'done'; message: ChatMessage }
  | { type: 'error'; error: string };

/** True when an error is the abort triggered by the caller's signal. */
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/**
 * Streaming message send via SSE.
 *
 * Calls `onEvent` for each event as it arrives. Pass an `AbortSignal` to cancel
 * an in-flight response; on abort the function returns cleanly (no throw) so the
 * caller can treat a user-initiated stop as a normal end of stream.
 */
export async function sendMessageStream(
  conversationId: string,
  message: string,
  mode: ChatMode,
  model: string | undefined,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message, mode, model }),
      signal,
    });
  } catch (err) {
    if (isAbortError(err)) return;
    throw err;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stream error ${response.status}: ${text}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(trimmed.slice(6)) as StreamEvent;
          onEvent(event);
        } catch {
          // skip malformed SSE
        }
      }
    }
  } catch (err) {
    // A caller-initiated abort is a normal stop, not an error.
    if (isAbortError(err) || signal?.aborted) return;
    throw err;
  }
}
