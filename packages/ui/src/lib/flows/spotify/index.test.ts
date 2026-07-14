import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardCardState, BoardCardTone } from '../board-card';

const { statsGet } = vi.hoisted(() => ({ statsGet: vi.fn() }));

vi.mock('@lib/client', () => ({
  api: {
    api: {
      spotify: {
        stats: { get: statsGet },
      },
    },
  },
}));

import { spotifyFlow } from './index';

beforeEach(() => {
  statsGet.mockReset();
});

describe('Spotify board card contract', () => {
  it('maps live library stats to collapsed and expanded content', async () => {
    statsGet.mockResolvedValue({
      data: {
        totalTracks: 42,
        totalGenres: 8,
        topGenres: [{ genre: 'rock', count: 12 }],
        decadeDistribution: { '2020s': 20 },
        yearRange: { oldest: 1998, newest: 2025 },
      },
      error: null,
    });

    await expect(spotifyFlow.boardCard.load()).resolves.toEqual({
      state: BoardCardState.READY,
      canOpen: true,
      summary: {
        status: { label: 'Active', tone: BoardCardTone.SUCCESS },
        primary: { label: 'Tracks', value: '42', detail: '8 genres' },
      },
      expanded: {
        heading: 'Library snapshot',
        metrics: [
          { label: 'Genres', value: '8' },
          { label: 'Top genre', value: 'rock' },
          { label: 'Year range', value: '1998-2025' },
        ],
        note: 'Open the flow for filters, charts, and track details.',
      },
    });
  });

  it('returns an openable empty state for a library with no tracks', async () => {
    statsGet.mockResolvedValue({
      data: {
        totalTracks: 0,
        totalGenres: 0,
        topGenres: [],
        decadeDistribution: {},
        yearRange: null,
      },
      error: null,
    });

    await expect(spotifyFlow.boardCard.load()).resolves.toMatchObject({
      state: BoardCardState.EMPTY,
      canOpen: true,
      title: 'No tracks synced',
    });
  });

  it('returns a stable error contract for failed or malformed responses', async () => {
    statsGet.mockResolvedValue({ data: { totalTracks: 'unknown' }, error: null });

    await expect(spotifyFlow.boardCard.load()).resolves.toMatchObject({
      state: BoardCardState.ERROR,
      canOpen: false,
      title: 'Spotify summary unavailable',
    });
  });

  it('omits an invalid provider year range without losing valid summary data', async () => {
    statsGet.mockResolvedValue({
      data: {
        totalTracks: 42,
        totalGenres: 8,
        topGenres: [],
        decadeDistribution: {},
        yearRange: { oldest: 0, newest: 2026 },
      },
      error: null,
    });

    const card = await spotifyFlow.boardCard.load();
    expect(card).toMatchObject({ state: BoardCardState.READY });
    if (card.state !== BoardCardState.READY) throw new Error('Expected a ready card');
    expect(card.expanded?.metrics).toContainEqual({
      label: 'Year range',
      value: 'Not available',
    });
  });
});
