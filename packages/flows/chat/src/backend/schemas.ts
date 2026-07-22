import { CHAT_MODES } from '@flows/shared';
import { t } from 'elysia';

export const chatConversationSchema = t.Object({
  id: t.String(),
  title: t.String(),
  createdAt: t.Number(),
  updatedAt: t.Number(),
});

export const chatMessageSchema = t.Object({
  id: t.String(),
  conversationId: t.String(),
  role: t.Union([t.Literal('user'), t.Literal('assistant'), t.Literal('system')]),
  content: t.String(),
  modelUsed: t.String(),
  providerUsed: t.Optional(t.String()),
  createdAt: t.Number(),
});

export const chatProviderGroupSchema = t.Object({
  provider: t.String(),
  models: t.Array(
    t.Object({
      id: t.String(),
      name: t.String(),
      tier: t.String(),
      pricing: t.String(),
      contextWindow: t.Number(),
      description: t.Optional(t.String()),
    }),
  ),
});

export const chatRequestSchema = t.Object({
  conversationId: t.String(),
  message: t.String(),
  mode: t.Optional(t.Union([t.Literal(CHAT_MODES.ROTATION), t.Literal(CHAT_MODES.SPECIFIC)])),
  model: t.Optional(t.String()),
});

export const chatSendResponseSchema = t.Object({
  userMessage: chatMessageSchema,
  assistantMessage: chatMessageSchema,
});

export const chatDeleteResponseSchema = t.Object({ success: t.Literal(true) });
export const chatErrorResponseSchema = t.Object({ error: t.String() });
