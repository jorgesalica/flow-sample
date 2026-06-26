import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { ChatConversation, ChatProviderGroup } from '@flows/shared';

vi.mock('../api', () => ({
  fetchModelCatalog: vi.fn().mockResolvedValue([]),
  fetchConversations: vi.fn().mockResolvedValue([]),
  fetchMessages: vi.fn().mockResolvedValue([]),
  deleteConversation: vi.fn().mockResolvedValue(undefined),
  sendMessageStream: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@lib/toast', () => ({ showError: vi.fn() }));

import * as api from '../api';
import { chatStore } from '../stores';
import Sidebar from './Sidebar.svelte';

const fetchModelCatalog = vi.mocked(api.fetchModelCatalog);
const fetchConversations = vi.mocked(api.fetchConversations);
const fetchMessages = vi.mocked(api.fetchMessages);
const deleteConversation = vi.mocked(api.deleteConversation);

// Fixed clock so formatRelativeTime is deterministic.
const NOW = 1_700_000_000_000;

function makeConversation(over: Partial<ChatConversation> = {}): ChatConversation {
  return {
    id: 'conv-1',
    title: 'My first chat',
    createdAt: NOW - 10_000,
    updatedAt: NOW - 10_000, // 10s ago -> "just now"
    ...over,
  };
}

const EMPTY_CATALOG: ChatProviderGroup[] = [];

/** Mount the Sidebar with the given conversations returned by init(). */
async function renderWith(conversations: ChatConversation[]) {
  fetchModelCatalog.mockResolvedValueOnce(EMPTY_CATALOG);
  fetchConversations.mockResolvedValueOnce(conversations);
  const utils = render(Sidebar);
  // onMount -> chatStore.init() resolves asynchronously; flush microtasks.
  await Promise.resolve();
  await Promise.resolve();
  return utils;
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    // Reset store conversations so leakage from prior tests can't show through.
    fetchModelCatalog.mockResolvedValue(EMPTY_CATALOG);
    fetchConversations.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('always renders the New Chat button', async () => {
    await renderWith([]);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('shows the empty-history placeholder when there are no conversations', async () => {
    await renderWith([]);
    expect(screen.getByText('No history yet. Start a conversation!')).toBeInTheDocument();
  });

  it('lists conversation titles once loaded', async () => {
    await renderWith([
      makeConversation({ id: 'a', title: 'Trip planning' }),
      makeConversation({ id: 'b', title: 'Recipe ideas' }),
    ]);

    expect(screen.getByText('Trip planning')).toBeInTheDocument();
    expect(screen.getByText('Recipe ideas')).toBeInTheDocument();
    // Negative space: placeholder gone.
    expect(screen.queryByText('No history yet. Start a conversation!')).not.toBeInTheDocument();
  });

  it('renders a deterministic relative timestamp', async () => {
    await renderWith([
      makeConversation({ id: 'a', title: 'Old chat', updatedAt: NOW - 2 * 60 * 60 * 1000 }),
    ]);
    expect(screen.getByText('2h ago')).toBeInTheDocument();
  });

  it('clicking New Chat starts a fresh conversation in the store', async () => {
    await renderWith([]);
    await fireEvent.click(screen.getByText('New Chat'));

    expect(get(chatStore).activeConversationId).toBeTruthy();
  });

  it('clicking a conversation loads its messages', async () => {
    await renderWith([makeConversation({ id: 'conv-7', title: 'Pick me' })]);
    fetchMessages.mockResolvedValueOnce([]);

    await fireEvent.click(screen.getByText('Pick me'));

    expect(fetchMessages).toHaveBeenCalledWith('conv-7');
    expect(get(chatStore).activeConversationId).toBe('conv-7');
  });

  it('clicking delete removes the conversation via the api', async () => {
    await renderWith([makeConversation({ id: 'conv-9', title: 'Delete me' })]);
    deleteConversation.mockResolvedValueOnce(undefined);

    await fireEvent.click(screen.getByTitle('Delete conversation'));

    expect(deleteConversation).toHaveBeenCalledWith('conv-9');
  });

  it('does not trigger a conversation load when only the delete button is clicked', async () => {
    await renderWith([makeConversation({ id: 'conv-9', title: 'Delete me' })]);
    deleteConversation.mockResolvedValueOnce(undefined);
    fetchMessages.mockClear();

    await fireEvent.click(screen.getByTitle('Delete conversation'));

    // handleDelete stops propagation, so selectConversation must not run.
    expect(fetchMessages).not.toHaveBeenCalled();
  });
});
