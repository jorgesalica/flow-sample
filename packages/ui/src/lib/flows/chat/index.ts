import type { FlowDefinition, FlowStats } from '../registry';
import { fetchConversations } from './api';
import ChatFlow from './ChatFlow.svelte';

async function getStats(): Promise<FlowStats> {
  try {
    const conversations = await fetchConversations();
    return {
      count: conversations.length,
      status: conversations.length > 0 ? 'active' : 'configured',
      statusMessage: `${conversations.length} Chats`,
    };
  } catch {
    return {
      count: 0,
      status: 'error',
      statusMessage: 'Backend unavailable',
    };
  }
}

export const chatFlow: FlowDefinition = {
  id: 'chat-flow',
  name: 'Chat Flow',
  icon: '💬',
  description: 'Converse with your favorite AI models.',
  route: '#/chat',
  color: 'from-blue-500 to-indigo-500',
  component: ChatFlow,
  getStats,
};
