import {
  BoardCardState,
  BoardCardTone,
  createBoardCardError,
  type BoardCardSnapshot,
} from '../board-card';
import type { FlowDefinition } from '../registry';
import { getLyricsStats } from './api';

function isValidCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

async function loadBoardCard(): Promise<BoardCardSnapshot> {
  try {
    const stats = await getLyricsStats();
    if (
      ![stats.total, stats.found, stats.notFound, stats.pending].every(isValidCount) ||
      stats.found + stats.notFound + stats.pending !== stats.total
    ) {
      throw new Error('Invalid lyrics stats response');
    }

    if (stats.total === 0) {
      return {
        state: BoardCardState.EMPTY,
        canOpen: true,
        status: { label: 'Configured', tone: BoardCardTone.INFO },
        title: 'No tracks to check',
        message: 'Sync the music library to begin lyrics coverage.',
      };
    }

    const processed = stats.found + stats.notFound;
    const coverage = Math.round((stats.found / stats.total) * 100);
    return {
      state: BoardCardState.READY,
      canOpen: true,
      summary: {
        status: { label: 'Active', tone: BoardCardTone.SUCCESS },
        primary: {
          label: 'Lyrics found',
          value: String(stats.found),
          detail: `${processed}/${stats.total} checked`,
        },
      },
      expanded: {
        heading: 'Lyrics coverage',
        metrics: [
          { label: 'Coverage', value: `${coverage}%` },
          { label: 'Pending', value: String(stats.pending) },
          { label: 'Unavailable', value: String(stats.notFound) },
        ],
        note: 'Open the flow to fetch missing lyrics or inspect individual tracks.',
      },
    };
  } catch {
    return createBoardCardError(
      'Lyrics summary unavailable',
      'Connect the backend and refresh the board to try again.'
    );
  }
}

export const lyricsFlow: FlowDefinition = {
  id: 'lyrics-flow',
  name: 'Lyrics Flow',
  icon: '🎤',
  description: 'Manage and view lyrics status for your library.',
  route: '/lyrics',
  boardCard: { load: loadBoardCard },
};
