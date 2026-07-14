import { createStatsBoardCard, FlowStatus, type FlowStats } from '../board-card';
import type { FlowDefinition } from '../registry';
import { fetchCanvasList } from './api';

async function getStats(): Promise<FlowStats> {
  try {
    const canvases = await fetchCanvasList();
    return {
      count: canvases.length,
      status: canvases.length > 0 ? FlowStatus.ACTIVE : FlowStatus.CONFIGURED,
    };
  } catch {
    return {
      count: 0,
      status: FlowStatus.ERROR,
      statusMessage: 'Backend unavailable',
    };
  }
}

export const canvasFlow: FlowDefinition = {
  id: 'canvas-flow',
  name: 'Text Canvas',
  icon: '📝',
  description: 'Paste any text and get a deep literary AI analysis.',
  route: '/canvas',
  boardCard: createStatsBoardCard(getStats, {
    metricLabel: 'Canvases',
    emptyTitle: 'No canvases yet',
    emptyMessage: 'Open Text Canvas to create an analysis.',
    errorTitle: 'Canvas summary unavailable',
    errorMessage: 'Connect the backend and refresh the board to try again.',
  }),
};
