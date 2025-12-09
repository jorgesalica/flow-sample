import type { FlowDefinition, FlowStats } from './registry';
import { getLyricsStats } from '@lib/lyricsApi';

async function getStats(): Promise<FlowStats> {
  try {
    const stats = await getLyricsStats();

    // Status is active if we have any tracks processed (found or not found)
    // or if we have pending tracks (meaning the system is aware of tracks)
    // Basically always active if DB has content
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
  icon: '🎤', // Material symbol name
  description: 'Manage and view lyrics status for your library.',
  route: '#/lyrics',
  color: 'from-pink-500 to-rose-500', // Gradient for the card
  getStats,
};
