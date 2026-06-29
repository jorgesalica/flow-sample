import type { ChatConversation, ChatMessage, ChatProviderGroup, ChatMode } from '@flows/shared';
import { showError } from '@lib/toast';
import * as api from './api';

/** Initial data produced by the route loader and used to hydrate the store. */
export interface ChatInitialData {
  catalog: ChatProviderGroup[];
  conversations: ChatConversation[];
  selectedModel: string;
}

/**
 * Runes-based chat state. A single module-level instance is exported as
 * {@link chatStore}; consumers read reactive fields directly (e.g.
 * `chatStore.conversations`) and call methods for mutations.
 */
class ChatStore {
  catalog = $state<ChatProviderGroup[]>([]);
  selectedModel = $state(''); // "provider:modelId" format
  chatMode = $state<ChatMode>('specific');
  lastProvider = $state(''); // provider that answered last (for rotation badge)
  lastModel = $state(''); // model that answered last
  conversations = $state<ChatConversation[]>([]);
  activeConversationId = $state<string | null>(null);
  messages = $state<ChatMessage[]>([]);
  isLoading = $state(false);
  isStreaming = $state(false);
  streamingContent = $state(''); // partial content being streamed

  /** Aborts the in-flight streaming request, if any. Not reactive state. */
  private streamController: AbortController | null = null;

  /** Seed the store from the route loader's data. Replaces the old `init()` fetch. */
  hydrate(data: ChatInitialData) {
    this.catalog = data.catalog;
    this.selectedModel = data.selectedModel;
    this.conversations = data.conversations;
  }

  setModel(providerAndModel: string) {
    this.selectedModel = providerAndModel;
  }

  setMode(mode: ChatMode) {
    this.chatMode = mode;
  }

  async loadConversation(id: string) {
    this.isLoading = true;
    this.activeConversationId = id;
    this.messages = [];
    try {
      this.messages = await api.fetchMessages(id);
      this.isLoading = false;
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : String(e));
      this.isLoading = false;
    }
  }

  startNewConversation() {
    const newId = crypto.randomUUID();
    this.activeConversationId = newId;
    this.messages = [];
    return newId;
  }

  async deleteConversation(id: string) {
    try {
      await api.deleteConversation(id);
      this.conversations = this.conversations.filter((c) => c.id !== id);
      if (this.activeConversationId === id) {
        this.activeConversationId = null;
        this.messages = [];
      }
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : String(e));
    }
  }

  async sendMessage(content: string) {
    if (!this.activeConversationId) {
      this.startNewConversation();
    }

    const convId = this.activeConversationId!;
    const mode = this.chatMode;
    const model = mode === 'specific' ? this.selectedModel : undefined;

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      conversationId: convId,
      role: 'user',
      content,
      modelUsed: '',
      createdAt: Date.now(),
    };

    this.messages = [...this.messages, tempUserMsg];
    this.isLoading = true;
    this.isStreaming = true;
    this.streamingContent = '';
    this.streamController = new AbortController();

    try {
      await api.sendMessageStream(
        convId,
        content,
        mode,
        model,
        (event) => {
          switch (event.type) {
            case 'user_message':
              // Replace temp user message with server version
              this.messages = this.messages.map((m) =>
                m.id === tempUserMsg.id ? event.message : m
              );
              break;

            case 'delta':
              this.streamingContent = this.streamingContent + event.delta;
              break;

            case 'done':
              this.messages = [...this.messages, event.message];
              this.lastProvider = event.message.providerUsed || '';
              this.lastModel = event.message.modelUsed || '';
              this.resetStreamingState();
              // Refresh conversation list in background
              api.fetchConversations().then((conversations) => {
                this.conversations = conversations;
              });
              break;

            case 'error':
              showError(event.error);
              this.resetStreamingState();
              break;
          }
        },
        this.streamController.signal
      );
    } catch (e: unknown) {
      this.messages = this.messages.filter((m) => m.id !== tempUserMsg.id);
      this.resetStreamingState();
      showError(e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Stop the in-flight streaming response. The user message stays (it was
   * already persisted server-side); the partial assistant text is discarded.
   */
  stopStreaming() {
    this.streamController?.abort();
    this.resetStreamingState();
  }

  /** Clears the transient streaming flags and the abort controller. */
  private resetStreamingState() {
    this.isLoading = false;
    this.isStreaming = false;
    this.streamingContent = '';
    this.streamController = null;
  }
}

export const chatStore = new ChatStore();
