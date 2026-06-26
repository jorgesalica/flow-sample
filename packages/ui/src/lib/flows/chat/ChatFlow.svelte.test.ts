import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { ChatConversation, ChatProviderGroup } from '@flows/shared';

// Mock the edge (the chat flow's api.ts) so the on-mount init never hits the network.
vi.mock('./api', () => ({
  fetchModelCatalog: vi.fn().mockResolvedValue([]),
  fetchConversations: vi.fn().mockResolvedValue([]),
  fetchMessages: vi.fn().mockResolvedValue([]),
  deleteConversation: vi.fn().mockResolvedValue(undefined),
  sendMessageStream: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@lib/toast', () => ({ showError: vi.fn() }));

import * as api from './api';
import ChatFlow from './ChatFlow.svelte';

const fetchModelCatalog = vi.mocked(api.fetchModelCatalog);
const fetchConversations = vi.mocked(api.fetchConversations);

function makeCatalog(): ChatProviderGroup[] {
  return [
    {
      provider: 'openai',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', tier: 'very_high', pricing: 'paid', contextWindow: 1 },
      ],
    },
  ];
}

function makeConversation(over: Partial<ChatConversation> = {}): ChatConversation {
  return { id: 'c1', title: 'Seeded chat', createdAt: 1, updatedAt: 1, ...over };
}

describe('ChatFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchModelCatalog.mockResolvedValue([]);
    fetchConversations.mockResolvedValue([]);
  });

  it('renders the chat header with title and the model selector controls', () => {
    render(ChatFlow);

    expect(screen.getByRole('heading', { name: 'Chat' })).toBeInTheDocument();
    // ModelSelector mode toggle is mounted.
    expect(screen.getByText('Rotate')).toBeInTheDocument();
    expect(screen.getByText('Specific')).toBeInTheDocument();
  });

  it('renders the message-list empty state and the input on first load', () => {
    render(ChatFlow);

    expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Send a message...')).toBeInTheDocument();
  });

  it('triggers the on-mount data load (model catalog + conversations)', () => {
    render(ChatFlow);

    expect(fetchModelCatalog).toHaveBeenCalledTimes(1);
    expect(fetchConversations).toHaveBeenCalledTimes(1);
  });

  it('shows the sidebar empty-history placeholder when there are no conversations', async () => {
    render(ChatFlow);
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByText('No history yet. Start a conversation!')).toBeInTheDocument();
  });

  it('renders loaded conversations in the sidebar (data state)', async () => {
    fetchModelCatalog.mockResolvedValueOnce(makeCatalog());
    fetchConversations.mockResolvedValueOnce([
      makeConversation({ id: 'c1', title: 'Astronomy questions' }),
    ]);

    render(ChatFlow);
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByText('Astronomy questions')).toBeInTheDocument();
    expect(screen.queryByText('No history yet. Start a conversation!')).not.toBeInTheDocument();
  });

  it('exposes a mobile menu toggle button', async () => {
    render(ChatFlow);
    const toggle = screen.getByLabelText('Toggle mobile menu');
    expect(toggle).toBeInTheDocument();

    // Clicking opens the overlay without throwing.
    await fireEvent.click(toggle);
    expect(toggle).toBeInTheDocument();
  });
});
