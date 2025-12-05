// Spotify Flow Registration
import { registerFlow, type FlowStats } from './registry';
import { ENDPOINTS } from '../config';

async function getSpotifyStats(): Promise<FlowStats> {
    try {
        const res = await fetch(ENDPOINTS.STATS);
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        return {
            count: data.totalTracks || 0,
            status: 'active',
            statusMessage: `${data.totalGenres || 0} genres`,
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
    getStats: getSpotifyStats,
});

export { getSpotifyStats };
