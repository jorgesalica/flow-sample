// Spotify Flow Registration
import { registerFlow, type FlowStats } from './registry';
import { api } from '@lib/client';
import SpotifyFlow from '@lib/pages/SpotifyFlow.svelte';

async function getSpotifyStats(): Promise<FlowStats> {
  try {
     
    const { data, error } = await api.api.spotify.stats.get();
    if (error) throw new Error('Failed to fetch stats');
    const stats = data as Record<string, unknown>;
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

// Auto-register on import
registerFlow({
  id: 'spotify',
  name: 'Spotify Flow',
  icon: '🎵',
  description: 'Explore your liked songs, discover genres, and analyze your music taste.',
  route: '#/spotify',
  color: 'from-green-400 to-emerald-500',
  component: SpotifyFlow,
  getStats: getSpotifyStats,
});

export { getSpotifyStats };
