import type { FlowDefinition, FlowStats } from './registry';
import { getLyricsStats } from '@lib/lyricsApi';
import LyricsFlow from '@lib/pages/LyricsFlow.svelte';

async function getStats(): Promise<FlowStats> {
  try {
    const stats = await getLyricsStats();

    const total = stats.total;
    const processed = stats.found + stats.notFound;

    if (total === 0) {
      return {
        count: 0,
        status: 'configured',
        statusMessage: 'Ready to sync',
      };
    }

    return {
      count: stats.found,
      status: 'active',
      statusMessage: `${processed}/${total} checked`,
    };
  } catch {
    return {
      count: 0,
      status: 'error',
      statusMessage: 'Backend unavailable',
    };
  }
}

export const lyricsFlow: FlowDefinition = {
  id: 'lyrics-flow',
  name: 'Lyrics Flow',
  icon: '🎤',
  description: 'Manage and view lyrics status for your library.',
  route: '#/lyrics',
  color: 'from-pink-500 to-rose-500',
  component: LyricsFlow,
  getStats,
};
