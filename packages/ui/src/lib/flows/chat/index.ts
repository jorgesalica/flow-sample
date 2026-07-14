import { createStatsBoardCard, FlowStatus, type FlowStats } from '../board-card';
import type { FlowDefinition } from '../registry';
import { fetchConversations } from './api';

async function getStats(): Promise<FlowStats> {
  try {
    const conversations = await fetchConversations();
    return {
      count: conversations.length,
      status: conversations.length > 0 ? FlowStatus.ACTIVE : FlowStatus.CONFIGURED,
    };
  } catch {
    return {
      count: 0,
      status: FlowStatus.ERROR,
      statusMessage: 'Backend unavailable',
    };
  }
}

export const chatFlow: FlowDefinition = {
  id: 'chat-flow',
  name: 'Chat Flow',
  icon: '💬',
  description: 'Converse with your favorite AI models.',
  route: '/chat',
  boardCard: createStatsBoardCard(getStats, {
    metricLabel: 'Chats',
    emptyTitle: 'No conversations yet',
    emptyMessage: 'Open Chat Flow to start a conversation.',
    errorTitle: 'Chat summary unavailable',
    errorMessage: 'Connect the backend and refresh the board to try again.',
  }),
};
