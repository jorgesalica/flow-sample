import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatConversation, ChatProviderGroup } from '@flows/shared';

// ── Mock the typed Eden client at the edge so the loader exercises the real
//    flow api.ts (error extraction) without touching the network. The mock fns
//    are hoisted alongside vi.mock so the factory can safely reference them. ──
const { modelsGet, conversationsGet, createApiClient } = vi.hoisted(() => ({
  modelsGet: vi.fn(),
  conversationsGet: vi.fn(),
  createApiClient: vi.fn(),
}));

vi.mock('@lib/client', () => {
  const client = {
    // Chat routes are mounted under /api/chat, so the Eden tree is api.api.chat
    api: {
      chat: {
        models: { get: modelsGet },
        conversations: Object.assign(() => ({ get: vi.fn(), delete: vi.fn() }), {
          get: conversationsGet,
        }),
      },
    },
  };
  return {
    api: client,
    createApiClient: (requestFetch: typeof fetch) => {
      createApiClient(requestFetch);
      return client;
    },
  };
});

vi.mock('@lib/toast', () => ({ showError: vi.fn() }));

import { load } from './+page';
import { showError } from '@lib/toast';
import type { ChatInitialData } from '@lib/flows/chat/stores.svelte';

const mockShowError = vi.mocked(showError);

function makeCatalog(): ChatProviderGroup[] {
  return [
    {
      provider: 'openai',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', tier: 'very_high', pricing: 'paid', contextWindow: 1 },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'high', pricing: 'paid', contextWindow: 1 },
      ],
    },
    {
      provider: 'anthropic',
      models: [
        { id: 'claude-3', name: 'Claude 3', tier: 'high', pricing: 'paid', contextWindow: 1 },
      ],
    },
  ];
}

function makeConversations(): ChatConversation[] {
  return [{ id: 'conv-1', title: 'First chat', createdAt: 1, updatedAt: 2 }];
}

/** Minimal SvelteKit load event — the loader takes no params/fetch. */
const requestFetch = vi.fn();
const loadEvent = { fetch: requestFetch } as unknown as Parameters<typeof load>[0];

describe('chat +page loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestFetch.mockReset();
  });

  it('returns the catalog, conversations, and defaults to the first model of the first provider', async () => {
    const catalog = makeCatalog();
    const conversations = makeConversations();
    modelsGet.mockResolvedValue({ data: catalog, error: null });
    conversationsGet.mockResolvedValue({ data: conversations, error: null });

    const result = await load(loadEvent);

    expect(result).toEqual({
      catalog,
      conversations,
      selectedModel: 'openai:gpt-4o',
    });
    expect(createApiClient).toHaveBeenCalledWith(requestFetch);
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('leaves selectedModel empty when the catalog is empty', async () => {
    modelsGet.mockResolvedValue({ data: [], error: null });
    conversationsGet.mockResolvedValue({ data: [], error: null });

    const result = (await load(loadEvent)) as ChatInitialData;

    expect(result.selectedModel).toBe('');
    expect(result.catalog).toEqual([]);
    expect(result.conversations).toEqual([]);
  });

  it('leaves selectedModel empty when the first provider has no models', async () => {
    modelsGet.mockResolvedValue({ data: [{ provider: 'empty', models: [] }], error: null });
    conversationsGet.mockResolvedValue({ data: [], error: null });

    const result = (await load(loadEvent)) as ChatInitialData;

    expect(result.selectedModel).toBe('');
  });

  it('toasts and falls back to empty defaults when the catalog fetch errors', async () => {
    modelsGet.mockResolvedValue({ data: null, error: { value: { error: 'backend down' } } });
    conversationsGet.mockResolvedValue({ data: makeConversations(), error: null });

    const result = await load(loadEvent);

    expect(result).toEqual({ catalog: [], conversations: [], selectedModel: '' });
    expect(mockShowError).toHaveBeenCalledWith('backend down');
  });

  it('toasts and falls back to empty defaults when the conversations fetch errors', async () => {
    modelsGet.mockResolvedValue({ data: makeCatalog(), error: null });
    conversationsGet.mockResolvedValue({ data: null, error: { value: { message: 'no convos' } } });

    const result = await load(loadEvent);

    expect(result).toEqual({ catalog: [], conversations: [], selectedModel: '' });
    expect(mockShowError).toHaveBeenCalledWith('no convos');
  });
});
