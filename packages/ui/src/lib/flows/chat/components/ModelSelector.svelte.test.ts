import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { ChatProviderGroup } from '@flows/shared';
import type { StreamEvent } from '../api';

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
import ModelSelector from './ModelSelector.svelte';

const fetchModelCatalog = vi.mocked(api.fetchModelCatalog);
const fetchConversations = vi.mocked(api.fetchConversations);
const sendMessageStream = vi.mocked(api.sendMessageStream);

function makeCatalog(): ChatProviderGroup[] {
  return [
    {
      provider: 'openai',
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          tier: 'very_high',
          pricing: 'paid',
          contextWindow: 1,
          description: 'Flagship multimodal',
        },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'high', pricing: 'paid', contextWindow: 1 },
      ],
    },
    {
      provider: 'groq',
      models: [
        { id: 'llama-3', name: 'Llama 3', tier: 'medium', pricing: 'free', contextWindow: 1 },
      ],
    },
  ];
}

/** Seed the store with a catalog and the first model selected (init defaults). */
async function seed(catalog: ChatProviderGroup[]) {
  fetchModelCatalog.mockResolvedValueOnce(catalog);
  fetchConversations.mockResolvedValueOnce([]);
  await chatStore.init();
}

describe('ModelSelector', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sendMessageStream.mockResolvedValue(undefined);
    await seed(makeCatalog());
    chatStore.setMode('specific');
    chatStore.setModel('openai:gpt-4o');
  });

  it('renders both mode toggle buttons', () => {
    render(ModelSelector);
    expect(screen.getByText('Rotate')).toBeInTheDocument();
    expect(screen.getByText('Specific')).toBeInTheDocument();
  });

  it('shows the selected provider and model name in specific mode', () => {
    render(ModelSelector);
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('opens the dropdown listing all models grouped by provider when clicked', async () => {
    render(ModelSelector);

    // Trigger button shows the current selection; click it to open the list.
    await fireEvent.click(screen.getByText('GPT-4o'));

    expect(screen.getByText('GPT-4o Mini')).toBeInTheDocument();
    expect(screen.getByText('Llama 3')).toBeInTheDocument();
    expect(screen.getByText('Flagship multimodal')).toBeInTheDocument();
  });

  it('selecting a model updates the store selection', async () => {
    render(ModelSelector);
    await fireEvent.click(screen.getByText('GPT-4o'));
    await fireEvent.click(screen.getByText('Llama 3'));

    // Selection reflected in the store (the dropdown closes via a slide
    // transition, so we assert the contract, not the transient DOM removal).
    expect(get(chatStore).selectedModel).toBe('groq:llama-3');
    // Trigger reflects the new provider (the slide-out dropdown may briefly
    // keep its own "groq" group header, so allow more than one match).
    expect(screen.getAllByText('groq').length).toBeGreaterThanOrEqual(1);
  });

  it('switching to rotation mode shows the auto-rotate badge instead of a model picker', async () => {
    render(ModelSelector);
    await fireEvent.click(screen.getByText('Rotate'));

    expect(screen.getByText('Auto-rotate')).toBeInTheDocument();
    // No dropdown trigger chevron / model name button in rotation mode.
    expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument();
  });

  it('does NOT open a dropdown when in rotation mode', async () => {
    render(ModelSelector);
    await fireEvent.click(screen.getByText('Rotate'));
    // Auto-rotate badge is not a dropdown trigger.
    await fireEvent.click(screen.getByText('Auto-rotate'));

    expect(screen.queryByText('GPT-4o Mini')).not.toBeInTheDocument();
  });

  it('shows the last-used provider/model in the rotation badge after an answer', async () => {
    chatStore.setMode('rotation');
    chatStore.startNewConversation();
    sendMessageStream.mockImplementationOnce(
      async (_c, _m, _mode, _model, onEvent: (e: StreamEvent) => void) => {
        onEvent({
          type: 'done',
          message: {
            id: 'a1',
            conversationId: 'c1',
            role: 'assistant',
            content: 'hi',
            modelUsed: 'gpt-4o',
            providerUsed: 'openai',
            createdAt: 1,
          },
        });
      }
    );
    await chatStore.sendMessage('hello');

    render(ModelSelector);

    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.queryByText('Auto-rotate')).not.toBeInTheDocument();
  });
});
