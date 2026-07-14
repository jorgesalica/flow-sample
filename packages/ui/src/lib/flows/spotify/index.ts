import { api } from '@lib/client';
import {
  BoardCardState,
  BoardCardTone,
  createBoardCardError,
  type BoardCardSnapshot,
} from '../board-card';
import type { FlowDefinition } from '../registry';

interface SpotifyBoardStats {
  totalTracks: number;
  totalGenres: number;
  topGenre: string | null;
  yearRange: { oldest: number; newest: number } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function readYear(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1000 && value <= 9999
    ? value
    : null;
}

function parseSpotifyStats(value: unknown): SpotifyBoardStats | null {
  if (!isRecord(value)) return null;
  const totalTracks = readCount(value.totalTracks);
  const totalGenres = readCount(value.totalGenres);
  if (totalTracks === null || totalGenres === null || !Array.isArray(value.topGenres)) return null;

  const firstGenre = value.topGenres[0];
  const topGenre =
    isRecord(firstGenre) &&
    typeof firstGenre.genre === 'string' &&
    firstGenre.genre.trim().length > 0
      ? firstGenre.genre
      : null;

  let yearRange: SpotifyBoardStats['yearRange'] = null;
  if (value.yearRange !== null) {
    if (!isRecord(value.yearRange)) return null;
    const oldest = readYear(value.yearRange.oldest);
    const newest = readYear(value.yearRange.newest);
    if (oldest !== null && newest !== null && oldest <= newest) {
      yearRange = { oldest, newest };
    }
  }

  return { totalTracks, totalGenres, topGenre, yearRange };
}

async function loadBoardCard(): Promise<BoardCardSnapshot> {
  try {
    const { data, error } = await api.api.spotify.stats.get();
    if (error) throw new Error('Failed to fetch Spotify stats');
    const stats = parseSpotifyStats(data);
    if (!stats) throw new Error('Invalid Spotify stats response');

    if (stats.totalTracks === 0) {
      return {
        state: BoardCardState.EMPTY,
        canOpen: true,
        status: { label: 'Configured', tone: BoardCardTone.INFO },
        title: 'No tracks synced',
        message: 'Sync Spotify to populate this board summary.',
      };
    }

    return {
      state: BoardCardState.READY,
      canOpen: true,
      summary: {
        status: { label: 'Active', tone: BoardCardTone.SUCCESS },
        primary: {
          label: 'Tracks',
          value: String(stats.totalTracks),
          detail: `${stats.totalGenres} genres`,
        },
      },
      expanded: {
        heading: 'Library snapshot',
        metrics: [
          { label: 'Genres', value: String(stats.totalGenres) },
          { label: 'Top genre', value: stats.topGenre ?? 'Not available' },
          {
            label: 'Year range',
            value: stats.yearRange
              ? `${stats.yearRange.oldest}-${stats.yearRange.newest}`
              : 'Not available',
          },
        ],
        note: 'Open the flow for filters, charts, and track details.',
      },
    };
  } catch {
    return createBoardCardError(
      'Spotify summary unavailable',
      'Connect the backend and refresh the board to try again.'
    );
  }
}

export const spotifyFlow: FlowDefinition = {
  id: 'spotify',
  name: 'Spotify Flow',
  icon: '🎵',
  description: 'Explore your liked songs, discover genres, and analyze your music taste.',
  route: '/spotify',
  boardCard: { load: loadBoardCard },
};
