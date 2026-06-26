// Spotify Flow Registration
import { type FlowStats, type FlowDefinition } from '../registry';
import { api } from '@lib/client';
import SpotifyFlow from './SpotifyFlow.svelte';

async function getSpotifyStats(): Promise<FlowStats> {
  try {
    const { data, error } = await api.api.spotify.stats.get();
    if (error) throw new Error('Failed to fetch stats');
    const stats = data as unknown as Record<string, unknown>;
    return {
      count: (stats.totalTracks as number) || 0,
      status: 'active',
      statusMessage: `${(stats.totalGenres as number) || 0} genres`,
    };
  } catch {
    return {
      count: 0,
      status: 'error',
      statusMessage: 'Failed to connect',
    };
  }
}

// Flow definition — hung on the board centrally in flows/index.ts
export const spotifyFlow: FlowDefinition = {
  id: 'spotify',
  name: 'Spotify Flow',
  icon: '🎵',
  description: 'Explore your liked songs, discover genres, and analyze your music taste.',
  route: '/spotify',
  color: 'from-green-400 to-emerald-500',
  component: SpotifyFlow,
  getStats: getSpotifyStats,
};

export { getSpotifyStats };
