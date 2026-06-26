import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { ChatConversation, ChatProviderGroup } from '@flows/shared';
import type { ChatInitialData } from './stores.svelte';

// Mock the edge (the chat flow's api.ts) so interactive actions never hit the network.
vi.mock('./api', () => ({
  fetchModelCatalog: vi.fn().mockResolvedValue([]),
  fetchConversations: vi.fn().mockResolvedValue([]),
  fetchMessages: vi.fn().mockResolvedValue([]),
  deleteConversation: vi.fn().mockResolvedValue(undefined),
  sendMessageStream: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@lib/toast', () => ({ showError: vi.fn() }));

import ChatFlow from './ChatFlow.svelte';

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

/** The flow now receives its initial data from the route loader via a prop. */
function makeInitialData(over: Partial<ChatInitialData> = {}): ChatInitialData {
  return { catalog: [], conversations: [], selectedModel: '', ...over };
}

/** Render the flow with loader-provided initial data. */
function renderFlow(initialData: ChatInitialData = makeInitialData()) {
  return render(ChatFlow, { props: { initialData } });
}

describe('ChatFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the chat header with title and the model selector controls', () => {
    renderFlow();

    expect(screen.getByRole('heading', { name: 'Chat' })).toBeInTheDocument();
    // ModelSelector mode toggle is mounted.
    expect(screen.getByText('Rotate')).toBeInTheDocument();
    expect(screen.getByText('Specific')).toBeInTheDocument();
  });

  it('renders the message-list empty state and the input on first load', () => {
    renderFlow();

    expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Send a message...')).toBeInTheDocument();
  });

  it('hydrates the store from the loader data instead of fetching on mount', () => {
    renderFlow(
      makeInitialData({
        catalog: makeCatalog(),
        conversations: [makeConversation({ id: 'c1', title: 'Astronomy questions' })],
        selectedModel: 'openai:gpt-4o',
      })
    );

    // The seeded model selection is reflected in the model selector.
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('shows the sidebar empty-history placeholder when there are no conversations', () => {
    renderFlow(makeInitialData());

    expect(screen.getByText('No history yet. Start a conversation!')).toBeInTheDocument();
  });

  it('renders loaded conversations in the sidebar (data state)', () => {
    renderFlow(
      makeInitialData({
        catalog: makeCatalog(),
        conversations: [makeConversation({ id: 'c1', title: 'Astronomy questions' })],
        selectedModel: 'openai:gpt-4o',
      })
    );

    expect(screen.getByText('Astronomy questions')).toBeInTheDocument();
    expect(screen.queryByText('No history yet. Start a conversation!')).not.toBeInTheDocument();
  });

  it('exposes a mobile menu toggle button', async () => {
    renderFlow();
    const toggle = screen.getByLabelText('Toggle mobile menu');
    expect(toggle).toBeInTheDocument();

    // Clicking opens the overlay without throwing.
    await fireEvent.click(toggle);
    expect(toggle).toBeInTheDocument();
  });
});
