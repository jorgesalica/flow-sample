import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardCardState, BoardCardTone } from '../board-card';

const { getLyricsStats } = vi.hoisted(() => ({ getLyricsStats: vi.fn() }));

vi.mock('./api', () => ({ getLyricsStats }));

import { lyricsFlow } from './index';

beforeEach(() => {
  getLyricsStats.mockReset();
});

describe('Lyrics board card contract', () => {
  it('maps live coverage stats to collapsed and expanded content', async () => {
    getLyricsStats.mockResolvedValue({ total: 20, found: 12, notFound: 3, pending: 5 });

    await expect(lyricsFlow.boardCard.load()).resolves.toEqual({
      state: BoardCardState.READY,
      canOpen: true,
      summary: {
        status: { label: 'Active', tone: BoardCardTone.SUCCESS },
        primary: { label: 'Lyrics found', value: '12', detail: '15/20 checked' },
      },
      expanded: {
        heading: 'Lyrics coverage',
        metrics: [
          { label: 'Coverage', value: '60%' },
          { label: 'Pending', value: '5' },
          { label: 'Unavailable', value: '3' },
        ],
        note: 'Open the flow to fetch missing lyrics or inspect individual tracks.',
      },
    });
  });

  it('returns an openable empty state when the music library is empty', async () => {
    getLyricsStats.mockResolvedValue({ total: 0, found: 0, notFound: 0, pending: 0 });

    await expect(lyricsFlow.boardCard.load()).resolves.toMatchObject({
      state: BoardCardState.EMPTY,
      canOpen: true,
      title: 'No tracks to check',
    });
  });

  it('returns a stable error contract when lyrics stats fail', async () => {
    getLyricsStats.mockRejectedValue(new Error('backend unavailable'));

    await expect(lyricsFlow.boardCard.load()).resolves.toMatchObject({
      state: BoardCardState.ERROR,
      canOpen: false,
      title: 'Lyrics summary unavailable',
    });
  });

  it('rejects inconsistent coverage totals', async () => {
    getLyricsStats.mockResolvedValue({ total: 20, found: 18, notFound: 3, pending: 5 });

    await expect(lyricsFlow.boardCard.load()).resolves.toMatchObject({
      state: BoardCardState.ERROR,
      title: 'Lyrics summary unavailable',
    });
  });
});
